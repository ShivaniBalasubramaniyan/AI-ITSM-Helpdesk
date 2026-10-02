# Cloud Infrastructure (AWS / Azure) & Database Access Requests
- **Article ID**: KB007
- **Category**: Access & Identity
- **Tags**: access, aws, azure, database, postgresql, iam, role, permission, credentials
- **Created**: 2026-01-25
- **Updated**: 2026-02-27

## Security Compliance & Principle of Least Privilege
Direct permanent root or admin credentials to production databases (PostgreSQL, MySQL, Redis, Snowflake) or AWS Accounts are strictly prohibited by SOC-2 / ISO27001 policies.

## How to Request Access
1. **Developer Sandbox / Staging Access**:
   - Access to Non-Prod / Staging environments is granted via Okta Group assignment.
   - Request Okta group: `grp-cloud-eng-staging` or `grp-db-readonly-staging`.
   - Approval: Team Lead or Engineering Manager.
2. **Production Temporary Just-In-Time (JIT) Access**:
   - Production read-only or break-glass access requires a valid Change Request (CR) or High/Critical incident number.
   - Maximum grant duration: 4 hours. All SQL queries and API sessions are logged to AWS CloudTrail and Datadog.
3. **AWS CLI SSO Token Configuration**:
   - Run: `aws configure sso`
   - SSO start URL: `https://company.awsapps.com/start`
   - SSO Region: `us-east-1`
   - Run `aws sso login` before running deployment scripts.
