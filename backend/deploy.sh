#!/bin/bash
# 手动部署脚本（调试用）。日常部署由 .github/workflows/deploy-backend.yml 自动完成。
set -e

cd /home/admin/foreverart-backend

# 清理 CI tar 解压遗留的 untracked 文件，避免 git pull 冲突
rm -rf deploy/

# 拉取最新代码
git pull origin master

# ── TrendRadar 部署（幂等，安全重复执行）──
TRENDRADAR_DIR=/home/admin/trendradar
mkdir -p "$TRENDRADAR_DIR"/{config,output}

# 同步 docker-compose.yml 和 config 模板（不覆盖已存在的 .env）
cp deploy/trendradar/docker-compose.yml "$TRENDRADAR_DIR/"
cp deploy/trendradar/config/config.yaml "$TRENDRADAR_DIR/config/"
cp deploy/trendradar/config/frequency_words.txt "$TRENDRADAR_DIR/config/"

# 首次部署：从 .env.example 创建 .env
if [ ! -f "$TRENDRADAR_DIR/.env" ]; then
  cp deploy/trendradar/.env.example "$TRENDRADAR_DIR/.env"
  chmod 600 "$TRENDRADAR_DIR/.env"
  echo "⚠️  TrendRadar .env 已创建，请编辑 $TRENDRADAR_DIR/.env 填入配置"
fi

# 拉取镜像并启动/重启容器
if command -v docker &> /dev/null; then
  cd "$TRENDRADAR_DIR"
  docker compose pull 2>/dev/null || true
  docker compose up -d
  echo "TrendRadar container started"
  cd /home/admin/foreverart-backend
else
  echo "⚠️  docker not found, TrendRadar not started"
fi

# 安装/更新 nginx 配置（独立文件，不覆盖 onday 的 sites-enabled/default）
sudo cp backend/nginx.conf /etc/nginx/sites-available/foreverart
sudo ln -sf /etc/nginx/sites-available/foreverart /etc/nginx/sites-enabled/foreverart
sudo cp web/nginx.conf /etc/nginx/sites-available/foreverart-app
sudo ln -sf /etc/nginx/sites-available/foreverart-app /etc/nginx/sites-enabled/foreverart-app
sudo cp web/nginx-news.conf /etc/nginx/sites-available/foreverart-news
sudo ln -sf /etc/nginx/sites-available/foreverart-news /etc/nginx/sites-enabled/foreverart-news

# 测试 nginx 配置并重载
sudo nginx -t && sudo nginx -s reload

# 重启应用服务
sudo systemctl restart foreverart-api

echo "Deployment completed successfully!"
