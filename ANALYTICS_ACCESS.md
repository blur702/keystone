# Analytics Stack Access Information

## 🚀 Access URLs

### Grafana (Visualization Dashboard)
- **URL**: http://localhost:3001/
- **Username**: admin
- **Password**: (130Bpm)
- **Purpose**: View metrics dashboards, logs, and analytics

### Prometheus (Metrics Database)
- **URL**: http://localhost:9090/
- **Purpose**: Query raw metrics, view targets, and alerts

### Loki (Log Aggregation)
- **URL**: http://localhost:3100/
- **Purpose**: API endpoint for log queries (accessed via Grafana)

## 🔥 Firewall Ports Opened

The following ports have been opened in the UFW firewall:
- **3001/tcp** - Grafana web interface
- **9090/tcp** - Prometheus web interface

## 📊 Available Features in Grafana

1. **Pre-configured Data Sources**:
   - Prometheus (for metrics)
   - Loki (for logs)

2. **Dashboards**:
   - Keystone Application Dashboard
   - System metrics from Node Exporter
   - Database metrics from PostgreSQL Exporter

3. **Explore**:
   - Query logs from all containers via Loki
   - Run custom Prometheus queries

## 🎯 Quick Start

1. Open Grafana: http://localhost:3001/
2. Login with admin/(130Bpm)
3. Navigate to Dashboards → Browse
4. Select "Keystone Application Dashboard"

## 🔍 Useful Prometheus Queries

Access at http://localhost:9090/

```promql
# System CPU usage
rate(node_cpu_seconds_total[5m])

# Memory usage
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes

# PostgreSQL connections
pg_stat_database_numbackends{datname="keystone"}

# Disk usage
node_filesystem_avail_bytes / node_filesystem_size_bytes
```

## 📝 Container Status Check

```bash
# Check all analytics containers
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "prometheus|grafana|loki|exporter|promtail"
```

## 🛠️ Troubleshooting

If you cannot access the services:

1. **Check container status**:
   ```bash
   docker ps | grep grafana
   docker ps | grep prometheus
   ```

2. **Check firewall**:
   ```bash
   sudo ufw status | grep -E "3001|9090"
   ```

3. **View logs**:
   ```bash
   docker logs keystone-grafana --tail 50
   docker logs keystone-prometheus --tail 50
   ```

4. **Test with curl**:
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:9090/-/healthy
   ```