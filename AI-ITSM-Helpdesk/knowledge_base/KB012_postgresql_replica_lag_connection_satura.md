# PostgreSQL Replica Lag & Connection Saturation
- **Article ID**: KB012
- **Category**: Database & Cloud
- **Tags**: postgresql, replica-lag, rds, connections
- **Author**: Database Reliability Engineering
- **Created**: 2026-10-27
- **Updated**: 2026-10-27

## Symptoms
- Read replicas lag behind primary by > 60 seconds
- Max connection errors (error 53300)

## Resolution
1. Check pg_stat_replication
2. Kill idle connections in transaction
3. Restart pgbouncer pooler
