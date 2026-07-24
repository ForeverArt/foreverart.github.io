#!/bin/bash
# 手动部署脚本（调试用）。日常部署由 .github/workflows/deploy-backend.yml 自动完成。
set -e

cd /home/admin/foreverart-backend

# 拉取最新代码
git pull origin master

# 安装/更新 nginx 配置（独立文件，不覆盖 onday 的 sites-enabled/default）
sudo cp backend/nginx.conf /etc/nginx/sites-available/foreverart
sudo ln -sf /etc/nginx/sites-available/foreverart /etc/nginx/sites-enabled/foreverart

# 测试 nginx 配置并重载
sudo nginx -t && sudo nginx -s reload

# 重启应用服务
sudo systemctl restart foreverart-api

echo "Deployment completed successfully!"
