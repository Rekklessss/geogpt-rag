# 🌐 IP Address Management Guide

Quick guide for updating IP addresses when your AWS EC2 instance restarts and gets a new public IP.

## 🚀 Quick Start - When Your EC2 IP Changes

### Method 1: Using the Cleanup Script (Recommended for Full Redeploy)

```bash
# Option A: Interactive prompt
./scripts/cleanup_redeploy.sh

# Option B: Direct IP argument  
./scripts/cleanup_redeploy.sh --ip YOUR_NEW_IP

# Option C: Environment variable
export GEOGPT_PUBLIC_IP="YOUR_NEW_IP"
./scripts/cleanup_redeploy.sh
```

### Method 2: Frontend Only (Quick Frontend Updates)

```bash
# Update frontend environment
echo "NEXT_PUBLIC_API_HOST=YOUR_NEW_IP" > frontend/.env.local

# Restart frontend
cd frontend
npm run dev  # for development
# OR
npm run build && npm start  # for production
```

## 📁 Files That Need IP Updates

### ✅ **Automatically Updated by cleanup_redeploy.sh:**
- `scripts/cleanup_redeploy.sh` - Service URLs in output messages

### ✅ **Updated Manually (Frontend):**
- `frontend/.env.local` - Environment variables
- `frontend/lib/config.ts` - Fallback IP (if needed)

### ✅ **Already Properly Configured:**
- `docker-compose.yml` - Uses localhost (internal container networking)
- `rag_server/config.py` - Uses localhost (internal container networking)
- `scripts/test_*.py` - Uses localhost (run inside container)
- `Dockerfile` - No IP references

## 🔍 Current Configuration Status

| File | Status | Notes |
|------|--------|-------|
| **Frontend** | ✅ Configurable | Uses environment variables |
| **Backend Pipeline** | ✅ Correct | Uses localhost for internal communication |
| **Docker Setup** | ✅ Correct | Uses proper container networking |
| **Cleanup Script** | ✅ Configurable | Updated with IP management |
| **Test Scripts** | ✅ Correct | Uses localhost (internal testing) |

## 🛠️ Usage Examples

### When EC2 Restarts with New IP

```bash
# Example: New IP is 54.123.456.789

# Method 1: Full system redeploy
./scripts/cleanup_redeploy.sh --ip 54.123.456.789

# Method 2: Frontend only (if backend is still running)
echo "NEXT_PUBLIC_API_HOST=54.123.456.789" > frontend/.env.local
cd frontend && npm run dev
```

### Check Current Configuration

```bash
# View current frontend IP
cat frontend/.env.local

# Check if services are accessible
curl -s http://YOUR_IP:8812/health
```

### Verify Everything Works

```bash
# Check Docker containers
sudo docker ps

# Test all services
sudo docker exec geogpt-rag-system python /app/scripts/test_system.py

# View logs
sudo docker-compose logs -f
```

## 🔄 Development vs Production

### Development Mode
- Uses `localhost` with Next.js proxy
- No IP updates needed for backend
- Only frontend config needs updates

### Production Mode  
- Frontend connects directly to EC2 services
- Requires IP updates when EC2 restarts
- Use cleanup script for full redeploys

## 📊 Service Architecture

```
Internet → [EC2 Public IP] → Docker Container
                              ├── Frontend (Port 3000)
                              ├── Embedding API (Port 8810)
                              ├── Reranking API (Port 8811)
                              └── GeoGPT API (Port 8812)
```

**Internal Communication**: All backend services use `localhost` ✅  
**External Access**: Frontend and external clients use public IP ⚙️ (configurable)

## 💡 Best Practices

1. **Always test after IP changes**: Use the health check endpoints
2. **Keep the cleanup script updated**: It handles most configuration automatically  
3. **Use environment variables**: More flexible than hardcoded values
4. **Document your current IP**: Keep track for your team

---

*This system is now designed to handle changing EC2 IP addresses with minimal manual configuration.* 