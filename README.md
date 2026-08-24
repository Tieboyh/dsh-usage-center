# dsh-usage-center

DSH 设置页中的独立用量中心。第一版展示：

- 今日各 Provider 的输入、缓存读取、输出 Token
- 按公开 API 单价计算的估价（不是账单）
- Z.ai Coding Plan 的会话、每周和账期额度百分比
- DeepSeek API 账户的可用总额、充值余额与赠送余额

所有统计均在本机完成。插件只暴露回环地址可访问的只读接口，凭据通过 DSH credentials 服务按需读取，不写入插件缓存。

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
