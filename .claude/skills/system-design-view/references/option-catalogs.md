# Platform option catalogs

Build the 2 or 3 options shown for confirmation from this table. Icon names are arguments for `scripts/fetch_icons.py` (`aws:` official AWS set, `logos:` colored logos, `si:` Simple Icons). Check unknown names with `fetch_icons.py --search <term>` before falling back to a badge.

## Capability mapping

| Capability | Hostinger VPS (self-hosted) | AWS | Other / portable |
|---|---|---|---|
| DNS / CDN / WAF | Cloudflare in front (`logos:cloudflare-icon`) | Route 53 (`aws:AmazonRoute53`), CloudFront (`aws:AmazonCloudFront`), WAF (`aws:AWSWAF`) | Cloudflare, Bunny |
| LB / ingress | Traefik (`si:traefikproxy`), Nginx (`logos:nginx`), Caddy (`si:caddy`) | ALB / NLB (`aws:ElasticLoadBalancing`) | HAProxy (no icon, badge), K8s Ingress |
| Compute | Docker Compose / Swarm (`logos:docker-icon`) | ECS Fargate or EC2 (`aws:AmazonElasticContainerService`), EC2 (`aws:AmazonEC2`), Lambda (`aws:AWSLambda`) | Kubernetes (`logos:kubernetes`), Fly.io, Cloud Run |
| Image registry | GHCR / Docker Hub | ECR (`aws:AmazonElasticContainerRegistry`) | GHCR (`logos:github-icon`) |
| Relational DB | Postgres container (`logos:postgresql`), MySQL (`logos:mysql-icon`) | RDS / Aurora (`aws:AmazonRDS`, `aws:AmazonAurora`) | Neon, Supabase, Cloud SQL |
| Non-relational DB | MongoDB (`logos:mongodb-icon`), Redis (`logos:redis`) | DynamoDB (`aws:AmazonDynamoDB`), DocumentDB | Atlas, Cassandra, Firestore |
| Cache / counters (INCR) | Redis / Valkey container | ElastiCache (`aws:AmazonElastiCache`) | Upstash, Memorystore |
| Queue / events | RabbitMQ (`logos:rabbitmq-icon`), Redis Streams | SQS (`aws:AmazonSimpleQueueService`), SNS, EventBridge, MSK | Kafka (`logos:kafka-icon`), NATS (`si:natsdotio`) |
| Object storage | Garage (no icon, badge), MinIO (`si:minio`) | S3 (`aws:AmazonSimpleStorageService`) | R2, Backblaze B2 |
| Disk | VPS NVMe, Docker named volumes | EBS (`aws:AmazonElasticBlockStore`), EFS | Persistent volumes |
| IaC | Ansible (`logos:ansible`), Compose in git | Terraform (`logos:terraform-icon`), CDK, CloudFormation | Pulumi (`logos:pulumi-icon`), OpenTofu |
| CI/CD | GitHub Actions (`logos:github-actions`) | CodePipeline, GitHub Actions | GitLab CI |
| Observability | Uptime Kuma (`si:uptimekuma`), Dozzle, Grafana (`logos:grafana`), Prometheus (`logos:prometheus`) | CloudWatch (`aws:AmazonCloudWatch`) | Grafana Cloud, Datadog |
| Secrets | `.env` + Docker secrets | Secrets Manager (`aws:AWSSecretsManager`), SSM | Vault (`logos:vault-icon`), Doppler |
| Backup | pg_dump / restic to offsite S3, snapshots | AWS Backup, RDS backups, S3 versioning | restic, Velero |
| Identity / auth | Keycloak container (`si:keycloak`) + shared Postgres, Traefik forward-auth | Keycloak on ECS + RDS; Cognito (`aws:AmazonCognito`) as the managed alternative | Keycloak, Zitadel, Auth0 |

## Hostinger facts to respect

- A VPS is a single KVM host: no managed VPC, no managed LB, no multi-AZ. Draw it as a `host` group with Docker networks as `network` groups; never AWS-style subnets.
- With one VPS, the host, its disk and its reverse proxy are SPOFs until a second VPS exists.
- For multi-VPS designs, draw the private link (WireGuard/Tailscale) and confirm with the user how the hosts connect. Never assume private networking.
- Default preset for this user's stack (confirm, do not assume): Traefik, Compose per project under `/opt/docker/<project>/`, shared Postgres and Redis, Garage S3, Uptime Kuma, Dozzle, Portainer, Adminer, automated Postgres backup, subdomains of the main domain.

## Keycloak as the auth layer

Draw it as its own node (`si:keycloak`; `aws:AmazonCognito` when the managed option is chosen), with an OIDC edge from the client, a token-validation edge from the ingress (forward-auth) or from the services, and an edge to its own DB. On a single VPS, mark Keycloak as the login SPOF and state what keeps working with tokens already issued.

## AWS defaults every option should state

- Region and number of AZs (default 2), public/private subnets per AZ, NAT gateway count (1 is a SPOF and cheaper, 1 per AZ is HA).
- ECS launch type (Fargate vs EC2), task CPU/memory, min/max tasks, target-tracking metric.
- RDS Multi-AZ and read replicas; DynamoDB on-demand vs provisioned.
- IaC tool and state backend (for example Terraform with S3 state and native lock).
