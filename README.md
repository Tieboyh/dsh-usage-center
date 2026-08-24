# dsh-usage-center

DSH 设置页中的独立用量中心。第一版展示：

- 今日各 Provider 的输入、缓存读取、输出 Token
- 按公开 API 单价计算的估价（不是账单）
- Z.ai Coding Plan 的会话、每周和账期额度百分比
- DeepSeek API 账户的可用总额、充值余额与赠送余额
- 设置侧栏与全部页面文案支持中文和英文，并实时跟随 DSH 语言设置
- 最近 365 天的每日 Token 活动热力图，以及累计、单日峰值和连续使用天数

所有统计均在本机完成。插件只暴露回环地址可访问的只读接口，凭据通过 DSH credentials 服务按需读取，不写入插件缓存。

## 数据刷新体验

- 成功数据会保存为本机快照，重新进入设置页或重启 DSH 后立即展示。
- 快照超过 1 分钟时先展示已有数据，再在后台自动刷新。
- 后台刷新完成后页面自动更新，不需要再次点击刷新。
- 手动刷新期间保留当前数据；上游暂时失败时继续显示上次成功快照。
- 快照位于 `<DSH_HOME>/storages/usage-center-snapshot.json`，只包含统计结果与账户余额，不包含 API Key。

## 安装

```sh
git clone https://github.com/Tieboyh/dsh-usage-center.git
cd dsh-usage-center
npm install
npm run check
dsh plugin --profile web add "$PWD"
```

安装、升级或卸载后需要重启 DSH Web。

## 凭据

插件复用 DSH 的凭据配置，不在仓库或浏览器中保存 API Key：

- `DEEPSEEK_API_KEY`：读取 DeepSeek 账户余额。
- `ZAI_CODING_CN_API_KEY` 或 `ZAI_API_KEY`：读取 Z.ai Coding Plan 额度。

API 估价只用于衡量等量 API 调用成本，不代表订阅实际扣费。
