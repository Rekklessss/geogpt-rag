# 🚀 GeoGPT-RAG Deployment Instructions

## 🔑 **Step 1: Set Your OpenAI API Key**

**IMPORTANT:** Never commit your API key to the repository. Set it as an environment variable instead.

### **Before Running Setup:**

```bash
# On your EC2 instance, export your OpenAI API key
export OPENAI_API_KEY="your-actual-openai-api-key-here"

# Make it persistent (optional)
echo 'export OPENAI_API_KEY="your-actual-openai-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

## 🧹 **Step 2: Clean Up Previous NVIDIA Issues**

```bash
# Remove any broken NVIDIA repository files
sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
sudo apt update
```

## 🚀 **Step 3: Run Setup**

```bash
# Clone/update repository
cd ~
git clone https://github.com/Rekklessss/geogpt-rag.git
# OR if already exists: cd geogpt-rag && git pull origin main

# Run setup
cd geogpt-rag
chmod +x scripts/setup_ec2.sh
./scripts/setup_ec2.sh
```

## ⚙️ **What the Setup Does:**

- ✅ **Detects GPU** and installs NVIDIA drivers if available
- ✅ **Cost optimization** - Uses GPT-4.1 Nano (cheapest OpenAI model)
- ✅ **Database setup** - PostgreSQL + Redis
- ✅ **Vector database** - Zilliz Cloud integration
- ✅ **Docker deployment** - All services containerized
- ✅ **Health checks** - Verifies everything works

## 🔍 **Verify Deployment:**

```bash
# Check services
~/monitor_geogpt.sh

# Test API
curl http://localhost:8812/health

# Check logs
docker-compose logs -f
```

## 💰 **Cost Configuration:**

- **Primary Model:** GPT-4.1 Nano ($0.10/$0.40 per 1M tokens)
- **Fallback Model:** GPT-4o-mini ($0.15/$0.60 per 1M tokens)
- **Estimated Savings:** 80-95% vs premium models

## 🔄 **For Updates/Redeployment:**

```bash
cd ~/geogpt-rag
git pull origin main
./scripts/cleanup_redeploy.sh
```

## 🔒 **Security Notes:**

- ✅ API keys are never stored in repository
- ✅ Use environment variables only
- ✅ Files use placeholder values for safety
- ✅ Private keys (.pem files) are gitignored

**Your API key is safe and will not trigger security alerts!** 🛡️ 