#!/bin/bash
#
# dev.sh - 一键启动前端、后端和 OpenCode 服务
#
# 使用 PID 文件管理 opencode 进程，避免误杀 AI Coding 使用的 opencode 实例。
#
# 用法:
#   pnpm dev        # 启动所有服务
#   Ctrl+C          # 优雅停止所有服务
#

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/.opencode-skills.pid"
OPENCODE_PORT=4097
OPENCODE_HOST=127.0.0.1
FRONTEND_ORIGIN="http://localhost:5173"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 杀死指定端口的进程
kill_by_port() {
  local port=$1
  local pids=""
  
  if command -v lsof &> /dev/null; then
    pids=$(lsof -i ":$port" -t 2>/dev/null || true)
  elif command -v ss &> /dev/null; then
    pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K\d+' || true)
  elif command -v netstat &> /dev/null; then
    pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | grep -oP '\d+(?=/)' || true)
  fi
  
  if [ -n "$pids" ]; then
    # Convert newlines to spaces for iteration
    pids=$(echo "$pids" | tr '\n' ' ')
    
    for pid in $pids; do
      if [ -n "$pid" ]; then
        log_warn "Port $port is in use by PID $pid. Killing..."
        kill "$pid" 2>/dev/null || true
      fi
    done
    
    sleep 1
    
    for pid in $pids; do
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        log_warn "Force killing PID $pid..."
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  fi
}

# 清理函数 - 在退出时调用
cleanup() {
  trap - SIGINT SIGTERM EXIT #防止递归调用
  echo ""
  log_info "Stopping services..."
  
  # 停止 opencode 进程（通过 PID 文件）
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      log_info "Stopping opencode (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  # 强力清理端口，防止残留
  log_info "Cleaning up ports..."
  kill_by_port $OPENCODE_PORT
  kill_by_port 3001 # Backend
  kill_by_port 5173 # Frontend
  
  log_info "All services stopped."
  exit 0
}

# 检查 opencode 是否可用
check_opencode() {
  if ! command -v opencode &> /dev/null; then
    log_error "opencode command not found. Please install it first."
    log_info "Installation: npm install -g @opencode-ai/cli"
    exit 1
  fi
}

# 启动 opencode 服务
start_opencode() {
  # 预先清理 OpenCode 端口
  kill_by_port $OPENCODE_PORT

  # 启动 opencode 并记录 PID
  log_info "Starting opencode serve on port $OPENCODE_PORT..."
  opencode serve --port "$OPENCODE_PORT" --hostname "$OPENCODE_HOST" --cors "$FRONTEND_ORIGIN" &
  local opencode_pid=$!
  echo "$opencode_pid" > "$PID_FILE"
  
  # 等待一小段时间，确保进程启动成功
  sleep 1
  if ! kill -0 "$opencode_pid" 2>/dev/null; then
    log_error "OpenCode failed to start. Check if port $OPENCODE_PORT is available."
    rm -f "$PID_FILE"
    exit 1
  fi
  
  log_info "OpenCode started (PID: $opencode_pid)"
}

print_banner() {
  echo ""
  echo -e "${CYAN}================================================================${NC}"
  echo -e "${CYAN}   🚀 Claude Skills Runtime POC - Development Environment   ${NC}"
  echo -e "${CYAN}================================================================${NC}"
  echo ""
  echo -e "   ${GREEN}●${NC} OpenCode Server   ${CYAN}http://${OPENCODE_HOST}:${OPENCODE_PORT}${NC}"
  echo -e "   ${GREEN}●${NC} Backend API       ${CYAN}http://localhost:3001${NC}"
  echo -e "   ${GREEN}●${NC} Frontend App      ${CYAN}${FRONTEND_ORIGIN}${NC}"
  echo ""
  echo -e "${CYAN}================================================================${NC}"
  echo ""
}

# 主函数
main() {
  cd "$PROJECT_ROOT"
  
  # 注册清理函数
  trap cleanup SIGINT SIGTERM EXIT
  
  log_info "Starting development environment..."
  log_info "Project root: $PROJECT_ROOT"
  echo ""
  
  # 预检：清理可能残留的开发服务器端口
  log_info "Checking for stale processes..."
  kill_by_port 3001
  kill_by_port 5173

  # 检查依赖
  check_opencode
  
  # 启动 opencode
  start_opencode
  
  echo ""
  log_info "Starting frontend and backend with concurrently..."
  log_info "Press Ctrl+C to stop all services."
  
  # 打印汇总信息
  print_banner
  
  # 启动前后端（concurrently 会接管终端）
  # 使用 exec 让 concurrently 成为主进程，这样信号处理更干净
  # 但我们需要保留 cleanup 能力，所以不用 exec
  npx concurrently -k \
    -p "[{name}]" \
    -n "FRONT,BACK" \
    -c "cyan.bold,blue.bold" \
    "pnpm --filter @skills-runtime/frontend dev" \
    "pnpm --filter @skills-runtime/backend dev"
  
  # 如果 concurrently 正常退出，也执行清理
  # cleanup  <-- 移除显式调用，完全依赖 trap
}

main "$@"
