#!/bin/bash
# tunnel.sh — start Next.js dev server + Cloudflare tunnel for nook
cd /home/admin/Documents/projects/nook
npm run dev &
DEV_PID=$!
sleep 8
/home/admin/cloudflared tunnel --url http://localhost:3000
