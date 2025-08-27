"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const axios_1 = require("axios");
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
/**
 * EmailService - Manages email sending and receiving via Brevo API
 * Provides webhook integration and subject-based email dispatching
 */
class EmailService extends eventemitter3_1.EventEmitter {
    constructor(db, config, logger) {
        super();
        this.subjectHandlers = new Map();
        this.db = db;
        this.config = config;
        this.logger = logger;
        // Initialize Brevo API client
        this.brevoApi = axios_1.default.create({
            baseURL: 'https://api.brevo.com/v3',
            headers: {
                'api-key': config.brevoApiKey,
                'content-type': 'application/json',
            },
        });
        // Register default handlers
        this.registerDefaultHandlers();
    }
    static getInstance(db, config, logger) {
        if (!EmailService.instance) {
            if (!db || !config || !logger) {
                throw new Error('EmailService requires dependencies for initialization');
            }
            EmailService.instance = new EmailService(db, config, logger);
        }
        return EmailService.instance;
    }
    /**
     * Send an email
     */
    async sendEmail(message) {
        try {
            const emailId = (0, uuid_1.v4)();
            // Prepare email data for Brevo
            const emailData = {
                to: message.to.map(r => ({ email: r.email, name: r.name })),
                subject: message.subject,
                sender: message.from || {
                    email: this.config.defaultFromEmail,
                    name: this.config.defaultFromName,
                },
            };
            // Add content
            if (message.templateId) {
                emailData.templateId = parseInt(message.templateId);
                emailData.params = message.templateData || {};
            }
            else {
                if (message.htmlContent) {
                    emailData.htmlContent = message.htmlContent;
                }
                if (message.textContent) {
                    emailData.textContent = message.textContent;
                }
            }
            // Add attachments
            if (message.attachments && message.attachments.length > 0) {
                emailData.attachment = message.attachments.map(att => ({
                    name: att.filename,
                    content: att.content,
                }));
            }
            // Add headers
            if (message.headers) {
                emailData.headers = message.headers;
            }
            // Add tags
            if (message.tags) {
                emailData.tags = message.tags;
            }
            // Schedule if needed
            if (message.scheduledAt) {
                emailData.scheduledAt = message.scheduledAt.toISOString();
            }
            // Send email via Brevo
            const response = await this.brevoApi.post('/smtp/email', emailData);
            // Store email record
            await this.db.query(`INSERT INTO email_logs (id, to_addresses, from_address, subject, status, message_id, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [
                emailId,
                JSON.stringify(message.to),
                JSON.stringify(message.from || {
                    email: this.config.defaultFromEmail,
                    name: this.config.defaultFromName,
                }),
                message.subject,
                'sent',
                response.data.messageId,
            ]);
            this.emit('email:sent', {
                id: emailId,
                messageId: response.data.messageId,
                to: message.to,
                subject: message.subject,
            });
            this.logger.info(`Email sent: ${message.subject} to ${message.to.map(r => r.email).join(', ')}`);
            return response.data.messageId;
        }
        catch (error) {
            this.logger.error('Failed to send email', {
                error: error.message,
                response: error.response?.data,
            });
            throw error;
        }
    }
    /**
     * Send bulk emails
     */
    async sendBulkEmails(messages) {
        const messageIds = [];
        // Process in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            const promises = batch.map(msg => this.sendEmail(msg));
            const results = await Promise.allSettled(promises);
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    messageIds.push(result.value);
                }
                else {
                    this.logger.error(`Failed to send email ${i + index}`, result.reason);
                }
            });
            // Rate limiting delay
            if (i + batchSize < messages.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return messageIds;
    }
    /**
     * Process webhook from Brevo
     */
    async processWebhook(body, signature) {
        try {
            // Verify webhook signature
            if (!this.verifyWebhookSignature(body, signature)) {
                throw new Error('Invalid webhook signature');
            }
            const event = {
                event: body.event,
                email: body.email,
                messageId: body['message-id'],
                subject: body.subject,
                link: body.link,
                reason: body.reason,
                date: new Date(body.date || Date.now()),
                data: body,
            };
            // Handle inbound emails
            if (event.event === 'inbound') {
                await this.handleInboundEmail(body);
            }
            else {
                // Handle status updates
                await this.updateEmailStatus(event);
            }
            this.emit(`email:${event.event}`, event);
            this.logger.info(`Email webhook processed: ${event.event}`);
        }
        catch (error) {
            this.logger.error('Failed to process email webhook', error);
            throw error;
        }
    }
    /**
     * Register a subject-based handler for inbound emails
     */
    registerSubjectHandler(pattern, handler) {
        this.subjectHandlers.set(pattern, handler);
        this.logger.info(`Registered email handler for pattern: ${pattern}`);
    }
    /**
     * Set default handler for unmatched subjects
     */
    setDefaultHandler(handler) {
        this.defaultHandler = handler;
        this.logger.info('Default email handler registered');
    }
    /**
     * Create or update email template
     */
    async createTemplate(template) {
        try {
            const response = await this.brevoApi.post('/smtp/templates', {
                name: template.name,
                subject: template.subject,
                htmlContent: template.htmlContent,
                textContent: template.textContent,
            });
            // Store template in database
            await this.db.query(`INSERT INTO email_templates (id, brevo_id, name, subject, html_content, text_content, variables)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name) DO UPDATE SET
         subject = $4, html_content = $5, text_content = $6, variables = $7, updated_at = NOW()`, [
                template.id || (0, uuid_1.v4)(),
                response.data.id,
                template.name,
                template.subject,
                template.htmlContent,
                template.textContent,
                JSON.stringify(template.variables || []),
            ]);
            this.logger.info(`Email template created: ${template.name}`);
            return response.data.id;
        }
        catch (error) {
            this.logger.error('Failed to create email template', error);
            throw error;
        }
    }
    /**
     * Get email statistics
     */
    async getStatistics(startDate, endDate) {
        try {
            const response = await this.brevoApi.get('/smtp/statistics/events', {
                params: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                },
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to get email statistics', error);
            throw error;
        }
    }
    /**
     * Handle inbound email
     */
    async handleInboundEmail(webhookData) {
        try {
            const inboundEmail = {
                id: (0, uuid_1.v4)(),
                from: {
                    email: webhookData.From,
                    name: webhookData.FromName,
                },
                to: this.parseRecipients(webhookData.To),
                subject: webhookData.Subject,
                htmlContent: webhookData.HtmlBody,
                textContent: webhookData.TextBody,
                attachments: this.parseAttachments(webhookData.Attachments),
                headers: webhookData.Headers || {},
                receivedAt: new Date(),
            };
            // Store inbound email
            await this.db.query(`INSERT INTO inbound_emails (id, from_address, to_addresses, subject, html_content, text_content, headers, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                inboundEmail.id,
                JSON.stringify(inboundEmail.from),
                JSON.stringify(inboundEmail.to),
                inboundEmail.subject,
                inboundEmail.htmlContent,
                inboundEmail.textContent,
                JSON.stringify(inboundEmail.headers),
                inboundEmail.receivedAt,
            ]);
            // Dispatch to subject handler
            await this.dispatchToHandler(inboundEmail);
            this.emit('email:received', inboundEmail);
            this.logger.info(`Inbound email received: ${inboundEmail.subject} from ${inboundEmail.from.email}`);
        }
        catch (error) {
            this.logger.error('Failed to handle inbound email', error);
            throw error;
        }
    }
    /**
     * Dispatch inbound email to appropriate handler
     */
    async dispatchToHandler(email) {
        // Check subject patterns
        for (const [pattern, handler] of this.subjectHandlers) {
            if (pattern.test(email.subject)) {
                try {
                    await handler(email);
                    this.logger.info(`Email dispatched to handler for pattern: ${pattern}`);
                    return;
                }
                catch (error) {
                    this.logger.error(`Handler failed for pattern ${pattern}`, error);
                    throw error;
                }
            }
        }
        // Use default handler if no pattern matches
        if (this.defaultHandler) {
            try {
                await this.defaultHandler(email);
                this.logger.info('Email dispatched to default handler');
            }
            catch (error) {
                this.logger.error('Default handler failed', error);
                throw error;
            }
        }
        else {
            this.logger.warn(`No handler found for email subject: ${email.subject}`);
        }
    }
    /**
     * Update email status from webhook
     */
    async updateEmailStatus(event) {
        try {
            await this.db.query(`UPDATE email_logs SET status = $1, updated_at = NOW()
         WHERE message_id = $2`, [event.event, event.messageId]);
            // Store event
            await this.db.query(`INSERT INTO email_events (id, message_id, event, email, data, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                (0, uuid_1.v4)(),
                event.messageId,
                event.event,
                event.email,
                JSON.stringify(event.data),
                event.date,
            ]);
        }
        catch (error) {
            this.logger.error('Failed to update email status', error);
        }
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(body, signature) {
        // Implement Brevo webhook signature verification
        const crypto = require('crypto');
        const computedSignature = crypto
            .createHmac('sha256', this.config.brevoWebhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');
        return computedSignature === signature;
    }
    /**
     * Parse email recipients
     */
    parseRecipients(recipients) {
        if (!recipients)
            return [];
        return recipients.split(',').map(r => {
            const match = r.trim().match(/^(.*?)\s*<(.+)>$/);
            if (match) {
                return { name: match[1], email: match[2] };
            }
            return { email: r.trim() };
        });
    }
    /**
     * Parse attachments
     */
    parseAttachments(attachments) {
        if (!attachments || !Array.isArray(attachments))
            return [];
        return attachments.map(att => ({
            filename: att.Name || att.filename,
            content: att.Content || att.content,
            contentType: att.ContentType || att.contentType,
        }));
    }
    /**
     * Register default email handlers
     */
    registerDefaultHandlers() {
        // Support ticket handler
        this.registerSubjectHandler(/^(support|help|ticket)/i, async (email) => {
            // Create support ticket
            await this.db.query(`INSERT INTO support_tickets (id, from_email, subject, content, status, created_at)
         VALUES ($1, $2, $3, $4, 'open', NOW())`, [(0, uuid_1.v4)(), email.from.email, email.subject, email.textContent || email.htmlContent]);
            // Send auto-reply
            await this.sendEmail({
                to: [email.from],
                subject: `Re: ${email.subject}`,
                htmlContent: `<p>Thank you for contacting support. Your ticket has been created and we will respond within 24 hours.</p>`,
            });
        });
        // Unsubscribe handler
        this.registerSubjectHandler(/^(unsubscribe|stop|remove)/i, async (email) => {
            await this.db.query(`UPDATE users SET email_opt_out = true WHERE email = $1`, [email.from.email]);
        });
        // Bounce handler
        this.registerSubjectHandler(/^(bounce|failure notice|undelivered)/i, async (email) => {
            // Extract bounced email address and mark as invalid
            const bouncedEmail = this.extractBouncedEmail(email.textContent || '');
            if (bouncedEmail) {
                await this.db.query(`UPDATE users SET email_valid = false WHERE email = $1`, [bouncedEmail]);
            }
        });
    }
    /**
     * Extract bounced email from bounce message
     */
    extractBouncedEmail(content) {
        const match = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        return match ? match[1] : null;
    }
}
exports.EmailService = EmailService;
exports.default = EmailService;
