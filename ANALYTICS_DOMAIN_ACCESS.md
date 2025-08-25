# Analytics Stack - Domain Access Configuration

## ✅ Analytics Services Available Through Domain

The analytics stack is now accessible through the main domain with SSL encryption:

### 🎯 Access URLs

#### Grafana (Monitoring Dashboard)
- **URL**: https://kevinalthaus.com/grafana/
- **Direct API**: https://kevinalthaus.com/grafana/api/health
- **Username**: admin
- **Password**: (130Bpm)
- **Purpose**: View metrics dashboards, logs, and system analytics

#### Prometheus (Metrics Database)
- **URL**: https://kevinalthaus.com/prometheus/
- **Purpose**: Query raw metrics, view targets, and configuration

#### Direct Access (Alternative)
- **Grafana Direct**: http://localhost:3001/
- **Prometheus Direct**: http://localhost:9090/

## 🔧 Configuration Applied

### Nginx Reverse Proxy
Added the following locations to `/etc/nginx/sites-available/kevinalthaus.com`:

```nginx
# Grafana Analytics Dashboard
location /grafana/ {
    proxy_pass http://localhost:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support for live updates
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Prometheus Metrics
location /prometheus/ {
    proxy_pass http://localhost:9090/prometheus/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Grafana Configuration
Updated environment variables in `docker-compose.analytics.yml`:
- `GF_SERVER_ROOT_URL`: "https://kevinalthaus.com/grafana"
- `GF_SERVER_SERVE_FROM_SUB_PATH`: "true"

### Prometheus Configuration
Added command line arguments:
- `--web.external-url=https://kevinalthaus.com/prometheus`
- `--web.route-prefix=/prometheus`

## 📊 Available Features

### In Grafana:
1. **Pre-configured Data Sources**:
   - Prometheus (metrics collection)
   - Loki (log aggregation)

2. **Dashboards**:
   - Keystone Application Dashboard
   - System metrics (CPU, memory, disk)
   - Database metrics (connections, performance)

3. **Explore Section**:
   - Query logs from all containers
   - Run custom Prometheus queries
   - Create ad-hoc visualizations

### In Prometheus:
1. **Metrics Explorer**
2. **Target Health Status**
3. **Configuration Viewer**
4. **Alert Rules** (if configured)

## 🔍 Quick Verification Commands

```bash
# Test Grafana API
curl -s https://kevinalthaus.com/grafana/api/health | jq

# Test Prometheus
curl -s https://kevinalthaus.com/prometheus/api/v1/targets | jq '.data.activeTargets[].health'

# Check container status
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "grafana|prometheus|loki"

# View Grafana logs
docker logs keystone-grafana --tail 20

# View Prometheus logs
docker logs keystone-prometheus --tail 20
```

## 🛡️ Security Notes

- All analytics services are accessed over HTTPS
- Authentication required for Grafana access
- Prometheus is read-only by default
- Services are not directly exposed to the internet (only through nginx proxy)
- Firewall rules allow only necessary ports

## 📝 Troubleshooting

### If Grafana login redirects infinitely:
1. Clear browser cookies for the domain
2. Try accessing the API directly: https://kevinalthaus.com/grafana/api/health
3. Use incognito/private browsing mode

### If Prometheus doesn't load:
1. Verify it's running: `docker ps | grep prometheus`
2. Check direct access: `curl http://localhost:9090/-/healthy`
3. Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## 🚀 Next Steps

1. Configure email alerts in Grafana
2. Set up custom dashboards for application metrics
3. Configure Prometheus alerting rules
4. Add more exporters for additional services
5. Set up log retention policies in Loki