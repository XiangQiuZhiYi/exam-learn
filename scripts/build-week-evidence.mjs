import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const questionIndex = JSON.parse(await readFile(path.join(projectDir, "data", "question-index.json"), "utf8"));
const outputPath = path.join(projectDir, "data", "week-evidence.json");

const weekSpecs = [
  ["W01", "外部学习", "26-27", "第9小时：系统架构设计基础", "87-96", "3-23", 0],
  ["W02", "项目辅导", "27-28", "第1小时：计算机系统基础知识", "10-20", "24-27", 20],
  ["W03", "项目辅导", "28-29", "第1小时：计算机系统基础知识", "10-20", "28-40", 25],
  ["W04", "项目辅导", "29-32", "第1小时：计算机系统基础知识", "10-20", "32-46", 20],
  ["W05", "项目辅导", "35-37", "第2小时：嵌入式基础知识", "21-27", "47-55", 15],
  ["W06", "项目辅导", "29-30", "第3小时：计算机网络基础知识", "28-34", "56-62", 25],
  ["W07", "项目辅导", "30-32", "第3小时：计算机网络基础知识", "28-34", "63-75", 25],
  ["W08", "项目辅导", "32-33", "第1小时：语言与多媒体", "10-20", "75-90", 20],
  ["W09", "项目辅导", "33", "第6小时：系统工程基础知识", "50-54", "91-104", 40],
  ["W10", "项目辅导", "33-34", "第4小时：信息系统基础知识", "36-42", "105-113", 20],
  ["W11", "项目辅导", "34-37", "第4小时：信息系统基础知识", "36-42", "114-144", 25],
  ["W12", "项目辅导", "37-39", "第5小时：信息安全技术基础知识", "43-49", "145-152", 20],
  ["W13", "项目辅导", "38-40", "第5小时：信息安全技术基础知识", "43-49", "153-159", 25],
  ["W14", "项目辅导", "40-41", "第5小时：信息安全技术基础知识", "43-49", "160-174", 35],
  ["W15", "项目辅导", "41-42", "第7小时：软件工程基础知识", "55-67", "175-184", 25],
  ["W16", "项目辅导", "42", "第7小时：软件工程基础知识", "55-67", "185-192", 20],
  ["W17", "项目辅导", "42-44", "第7小时：软件工程基础知识", "55-67", "192-199", 20],
  ["W18", "项目辅导", "43-45", "第7小时：软件工程基础知识", "55-67", "200-204", 20],
  ["W19", "项目辅导", "45-46", "第7小时：软件工程基础知识", "55-67", "205-217", 40],
  ["W20", "项目辅导", "46-47", "第8小时：数据库设计基础知识", "68-85", "218-223", 20],
  ["W21", "项目辅导", "47-49", "第8小时：数据库设计基础知识", "68-85", "224-230", 25],
  ["W22", "项目辅导", "48-49", "第8小时：数据库设计基础知识", "68-85", "231-233", 25],
  ["W23", "项目辅导", "49-50", "第8小时：数据库设计基础知识", "68-85", "234-247", 40],
  ["W24", "项目辅导", "50", "第9小时：系统架构设计基础知识", "87-96", "248-253", 20],
  ["W25", "项目辅导", "50-51", "第9小时：系统架构设计基础知识", "87-96", "254-258", 20],
  ["W26", "项目辅导", "50-53", "第9小时：系统架构设计基础知识", "87-96", "259-270", 35],
  ["W27", "项目辅导", "53-54", "第10小时：系统质量属性与架构评估", "97-104", "271-276", 20],
  ["W28", "项目辅导", "54", "第10小时：系统质量属性与架构评估", "97-104", "277-284", 20],
  ["W29", "项目辅导", "54", "第10小时：系统质量属性与架构评估", "97-104", "285-304", 35],
  ["W30", "项目辅导", "54-55", "第11小时：软件可靠性基础知识", "105-111", "305-315", 20],
  ["W31", "项目辅导", "54-55", "第11小时：软件可靠性基础知识", "105-111", "316-329", 35],
  ["W32", "项目辅导", "55-56", "第12小时：软件架构的演化和维护", "112-118", "330-340", 20],
  ["W33", "项目辅导", "55-57", "第12小时：软件架构的演化和维护", "112-118", "341-351", 20],
  ["W34", "项目辅导", "56-58", "第12小时：软件架构的演化和维护", "112-118", "352-368", 35],
  ["W35", "项目辅导", "58-60", "第13小时：未来信息综合技术", "119-124", "369-386", 25],
  ["W36", "整卷诊断", "58-60", "第13小时：未来信息综合技术", "119-124", "387-404", 75],
  ["W37", "专题补充", "60-61", "第23/25小时：知识产权/专业英语", "199-207、222-225", "补充专题", 25],
  ["W38", "专题补充", "60", "第24小时：应用数学", "208-221", "补充专题", 25],
  ["W39", "整卷模考", "26-61", "第30小时：模拟试题Ⅱ（上午）", "265-282", "全范围", 75],
  ["W40", "终期验收", "26-61", "综合知识全范围回查", "10-225", "全范围", 75],
].map(([week, channel, outlinePages, guideSection, guidePdfPages, textbookPages, targetCount]) => ({
  week, channel, outlinePages, guideSection, guidePdfPages, textbookPages, targetCount,
}));

const topicRules = [
  ["W23", "database-design", /在数据库设计的需求分析|数据库设计.*阶段/, 30],
  ["W26", "architecture-style", /可编程机器人.*编译器|编译过程.*阶段.*输入/, 30],
  ["W03", "operating-system", /微内核.*操作系统|磁盘调度/, 30],
  ["W17", "structured-analysis", /软件概要设计|模块化的程序结构/, 30],
  ["W04", "middleware-component", /JavaEE.*遗产系统|JCA|JMS|Java IDL/, 30],
  ["W19", "testing-project", /软件重用|软件复用|版本控制工具|软件评价工具/, 30],
  ["W05", "embedded", /嵌入式系统设计.*低功耗/, 30],
  ["W37", "intellectual-property", /著作权|知识产权|专利|商标|商业秘密|侵权|保护期限|许可使用|软件著作权|产权/, 10],
  ["W38", "applied-math", /概率|期望|方差|线性规划|决策树|最大流|最短路径|关键路径|网络图|盈亏平衡|随机|组合数|排列|数学|收益矩阵|决策论|图论/, 9],
  ["W35", "future-ai-edge", /人工智能|机器学习|深度学习|神经网络|机器人4\.0|机器人技术|边缘计算|物联网|CPS|信息物理|区块链/, 9],
  ["W36", "future-cloud-data", /数字孪生|云计算|大数据|数据湖|MapReduce|Hadoop|云原生|虚拟化|容器/, 9],
  ["W34", "architecture-maintenance", /大型网站|架构维护|网站架构|负载均衡|反向代理|分布式缓存|CDN/, 9],
  ["W33", "evolution-evaluation", /演化.*评估|维护.*评估|演化原则|演化成本|演化度量/, 10],
  ["W32", "architecture-evolution", /架构演化|软件演化|演化方式|演化分类|动态演化|静态演化/, 9],
  ["W31", "reliability-design", /容错|故障恢复|冗余|N模|避错|检错|可靠性测试|故障注入|软件可靠性评价/, 10],
  ["W30", "reliability-metrics", /可靠性|失效率|平均无故障|MTBF|MTTF|可用性计算|可靠度/, 9],
  ["W29", "atam", /ATAM|架构权衡分析|效用树|权衡点/, 12],
  ["W28", "saam", /SAAM|敏感点|非风险点|风险点|场景交互|架构评估/, 10],
  ["W27", "quality-attribute", /质量属性|可修改性|可测试性|易用性|性能场景|可用性场景|刺激源|响应度量/, 9],
  ["W25", "absd", /ABSD|基于架构的软件开发|架构复审|架构文档化/, 12],
  ["W26", "architecture-style", /架构风格|DSSA|特定领域软件架构|管道.*过滤器|黑板|仓库风格|解释器风格|调用返回|独立构件|事件系统|MVC|分层架构/, 10],
  ["W24", "architecture-basics", /软件架构|系统架构|架构设计|利益相关者|架构视图|架构描述语言|ADL/, 7],
  ["W22", "normalization", /函数依赖|候选关键字|候选键|范式|1NF|2NF|3NF|BCNF|无损连接|模式分解|传递依赖|部分依赖/, 12],
  ["W21", "relational-model", /关系代数|关系模型|选择运算|投影运算|自然连接|笛卡尔积|参照完整性|实体完整性|外键|元组/, 10],
  ["W23", "database-design", /E-R|ER图|数据库设计|数据字典|数据库实施|数据库维护|NoSQL|键值数据库|列族|文档数据库|图数据库|ORM|ODBC|JDBC/, 10],
  ["W20", "database-basics", /数据库|DBMS|三级模式|外模式|内模式|概念模式|数据独立性|数据模型/, 6],
  ["W18", "object-oriented", /面向对象|UML|用例图|类图|顺序图|序列图|状态图|活动图|聚合|组合|继承|多态|对象模型/, 10],
  ["W17", "structured-analysis", /数据流图|DFD|结构化分析|结构化设计|加工逻辑|数据字典|模块结构图|变换分析|事务分析/, 10],
  ["W16", "requirements", /需求工程|需求获取|需求分析|需求验证|需求变更|需求跟踪|需求规格|功能需求|非功能需求|原型法/, 9],
  ["W15", "process-model", /瀑布|螺旋模型|增量模型|喷泉模型|敏捷|统一过程|RUP|CMMI|软件过程|过程模型|极限编程|XP|Scrum/, 10],
  ["W19", "testing-project", /软件测试|白盒|黑盒|覆盖率|等价类|边界值|测试用例|单元测试|集成测试|确认测试|项目管理|项目时间|项目范围|风险管理|配置管理|挣值|关键路径|软件构件|CBSE|净室|域检查|输入设计/, 9],
  ["W14", "security-attack", /拒绝服务|DoS|DDoS|攻击|入侵|漏洞|防火墙|病毒|木马|恶意代码|风险评估|等级保护|安全审计|扫描器|IDS|IPS/, 9],
  ["W13", "security-auth", /数字签名|消息摘要|哈希|Hash|MD5|SHA|访问控制|RBAC|DAC|MAC|身份认证|密钥管理|认证码|PKI|证书/, 10],
  ["W12", "security-crypto", /机密性|完整性|可用性|对称加密|非对称加密|加密算法|解密|DES|AES|RSA|密码学|信息安全/, 8],
  ["W11", "information-systems", /TPS|MIS|DSS|ERP|OAS|ES\b|商业智能|数据仓库|电子政务|电子商务|企业信息化|信息化架构/, 10],
  ["W10", "information-system-basics", /信息系统|信息化|系统规划|信息系统生命周期|开发方法|业务流程重组|BPR/, 7],
  ["W09", "system-performance", /系统工程|性能|吞吐量|响应时间|利用率|加速比|基准测试|阿姆达尔|Amdahl|性能评价|MBSE/, 9],
  ["W05", "embedded", /嵌入式|实时系统|安全攸关|微控制器|单片机|DSP|FPGA|片上系统|SoC/, 12],
  ["W07", "networking", /TCP|UDP|IP地址|IPv|DNS|DHCP|路由|交换机|网关|代理|HTTP|HTTPS|ARP|ICMP|子网|以太网|WLAN|局域网|广域网|网络工程|SAN|NAS/, 9],
  ["W06", "communications", /OSI|网络层|传输层|数据链路|物理层|分组交换|电路交换|信道|复用|差错控制|调制|通信|拓扑/, 8],
  ["W08", "language-media", /编译|解释器|程序设计语言|词法|语法|语义|文法|多媒体|图像|音频|视频|压缩|JPEG|MPEG|采样|像素|面向对象程序设计/, 9],
  ["W03", "operating-system", /操作系统|微内核|进程|线程|信号量|PV操作|死锁|页面置换|虚拟内存|存储管理|文件系统|磁盘调度|磁头|旋转速度|作业调度|临界区|互斥|同步/, 10],
  ["W04", "middleware-component", /中间件|消息队列|应用服务器|构件|组件|CORBA|COM\+|EJB|Web Service|远程过程调用|RPC|企业应用集成|信息集成/, 9],
  ["W02", "hardware-storage", /CPU|处理器|指令|流水线|Cache|高速缓存|主存|存储器|磁盘阵列|RAID|总线|寄存器|校验码|海明码|奇偶校验|寻址|输入输出|I\/O|GPU/, 8],
];

function normalized(text) {
  return text.replace(/\s+/g, " ").replace(/[“”'\"，。；：、]/g, "").trim();
}

function focusedSnippet(text) {
  const first = text.indexOf("●");
  const second = text.indexOf("●", first + 1);
  return second > first ? text.slice(first, second) : text;
}

function groupQuestions(questions) {
  const groups = [];
  for (const question of questions) {
    const fingerprint = normalized(question.snippet).slice(0, 90);
    const previous = groups.at(-1);
    if (previous && question.number === previous.questions.at(-1).number + 1 &&
        fingerprint.length >= 50 && previous.fingerprint.slice(0, 65) === fingerprint.slice(0, 65)) {
      previous.questions.push(question);
    } else {
      groups.push({ fingerprint, questions: [question], text: focusedSnippet(question.snippet) });
    }
  }
  return groups;
}

function classify(group) {
  const text = group.text;
  if (group.questions[0].number >= 71) return { week: "W37", tag: "professional-english", confidence: "high" };
  if (/微内核.*操作系统/.test(text)) return { week: "W03", tag: "operating-system", confidence: "high" };
  if (/SNMP|网络管理/.test(text)) return { week: "W07", tag: "networking", confidence: "high" };
  if (/语音识别.*每个过程.*输入/.test(text)) return { week: "W26", tag: "architecture-style", confidence: "high" };
  if (/ATAM|体系结构权衡分析|架构权衡分析/.test(text)) return { week: "W29", tag: "atam", confidence: "high" };
  if (/SAAM|基于场景的架构分析/.test(text)) return { week: "W28", tag: "saam", confidence: "high" };
  if (/软件质量属性.*设计策略/.test(text)) return { week: "W27", tag: "quality-attribute", confidence: "high" };
  if (/系统移植|架构维护|体系结构维护/.test(text)) return { week: "W34", tag: "architecture-maintenance", confidence: "high" };
  const scored = topicRules.map(([week, tag, pattern, weight], order) => {
    const matches = text.match(new RegExp(pattern.source, `${pattern.flags.includes("i") ? "i" : ""}g`)) ?? [];
    return { week, tag, score: matches.length * weight, order };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);
  if (scored.length) return { week: scored[0].week, tag: scored[0].tag, confidence: scored[0].score >= 16 ? "high" : "medium" };
  const n = group.questions[0].number;
  if (n <= 12) return { week: n % 2 ? "W02" : "W03", tag: "computer-basics", confidence: "low" };
  if (n <= 20) return { week: n % 2 ? "W06" : "W07", tag: "computer-network", confidence: "low" };
  if (n <= 30) return { week: n % 2 ? "W10" : "W11", tag: "information-system", confidence: "low" };
  if (n <= 50) return { week: n % 3 === 0 ? "W18" : n % 3 === 1 ? "W19" : "W16", tag: "software-engineering", confidence: "low" };
  if (n <= 60) return { week: n % 2 ? "W24" : "W26", tag: "software-architecture", confidence: "low" };
  return { week: n % 2 ? "W37" : "W38", tag: "supplement", confidence: "low" };
}

const byWeek = Object.fromEntries(weekSpecs.map((spec) => [spec.week, []]));
for (const paper of questionIndex.papers) {
  for (const group of groupQuestions(paper.questions)) {
    const classification = classify(group);
    byWeek[classification.week].push({
      year: paper.year,
      numbers: group.questions.map((item) => item.number),
      questionPages: [...new Set(group.questions.map((item) => item.questionPage))],
      answerPages: [...new Set(group.questions.map((item) => item.answerPage))],
      tag: classification.tag,
      confidence: classification.confidence,
      practiceType: "chapter-training",
      requirement: "optional",
      trust: "historical-paper",
      disputeNote: null,
    });
  }
}

for (const spec of weekSpecs.filter((item) => !["W36", "W39", "W40"].includes(item.week))) {
  const groups = byWeek[spec.week].sort((a, b) => b.year - a.year || a.numbers[0] - b.numbers[0]);
  let selected = 0;
  const tagCounts = new Map();
  for (const group of groups) {
    if (group.confidence === "low") continue;
    const tagCount = tagCounts.get(group.tag) ?? 0;
    if (tagCount < 2 && selected + group.numbers.length <= spec.targetCount) {
      group.requirement = "required";
      tagCounts.set(group.tag, tagCount + 1);
      selected += group.numbers.length;
    }
  }
}

const recallLinks = {
  W02: [{ materialId: "recall-2025", pdfPages: [1], topics: ["硬件与嵌入式题：10、15、16"] }],
  W03: [{ materialId: "recall-2025", pdfPages: [1], topics: ["操作系统题：1、22、23"] }],
  W07: [{ materialId: "recall-2025", pdfPages: [1], topics: ["网络题：2、5、14"] }],
  W12: [{ materialId: "recall-2025", pdfPages: [1], topics: ["信息安全题：60"] }],
  W15: [{ materialId: "recall-2025", pdfPages: [1], topics: ["软件工程题：3、6、8"] }],
  W18: [{ materialId: "recall-2023", pdfPages: [3, 4], topics: ["UML 与面向对象主题摘要"] }],
  W21: [{ materialId: "recall-2025", pdfPages: [1], topics: ["数据库题：7、27、28"] }],
  W26: [{ materialId: "recall-2023", pdfPages: [5, 6], topics: ["架构风格主题摘要"] }],
  W27: [{ materialId: "recall-2025", pdfPages: [1], topics: ["架构与质量属性题：12、13、29"] }],
  W35: [{ materialId: "recall-2023", pdfPages: [7], topics: ["新技术主题摘要"] }],
  W37: [{ materialId: "recall-2025", pdfPages: [1], topics: ["知识产权题：4、48、49"] }],
  W38: [{ materialId: "recall-2025", pdfPages: [1], topics: ["应用数学题：11、40、67"] }],
};

const fullPapers = {
  W36: { year: 2019, materialId: "paper-2019", practiceType: "full-paper-diagnostic", requirement: "diagnostic", scoreTarget: 52, minimumScore: 48, disputeNote: null },
  W39: { year: 2020, materialId: "paper-2020", practiceType: "full-paper-mock", requirement: "required", scoreTarget: 52, minimumScore: 48, disputeNote: null },
  W40: { year: 2021, materialId: "paper-2021", practiceType: "full-paper-final", requirement: "required", scoreTarget: 52, minimumScore: 48, disputeNote: null },
};

const weeks = weekSpecs.map((spec) => {
  const requiredCount = byWeek[spec.week].filter((item) => item.requirement === "required").reduce((sum, item) => sum + item.numbers.length, 0);
  return {
    ...spec,
    outlineMaterialId: "syllabus-2022",
    guideMaterialId: "guide-32h-2023",
    historicalPractice: byWeek[spec.week],
    guideSupplementNeeded: !fullPapers[spec.week] && Math.max(0, spec.targetCount - requiredCount),
    fullPaper: fullPapers[spec.week] ?? null,
    recall: (recallLinks[spec.week] ?? []).map((item) => ({ ...item, practiceType: "trend-review", scored: false, trust: "recall", viewAfterFormalPractice: true, disputeNote: "回忆/还原内容，仅作趋势线索。" })),
    threshold: ["W36", "W39", "W40"].includes(spec.week)
      ? { target: "52/75", minimum: "48/75" }
      : { percentage: Number(spec.week.slice(1)) <= 12 ? 60 : Number(spec.week.slice(1)) <= 24 ? 65 : 70 },
  };
});

const payload = {
  schemaVersion: 1,
  generatedFrom: "data/question-index.json",
  rules: {
    primaryWeekOnly: true,
    sharedStemGroupsKeptTogether: true,
    requiredPrefersRecentYears: true,
    maximumRequiredGroupsPerTag: 2,
    recallScored: false,
    disputesUse: "新版考试大纲与主教材优先；旧解析仅作参考并标记解析争议。",
  },
  weeks,
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  output: path.relative(projectDir, outputPath),
  weeks: weeks.length,
  historicalQuestions: weeks.reduce((sum, week) => sum + week.historicalPractice.reduce((count, group) => count + group.numbers.length, 0), 0),
  requiredQuestions: weeks.reduce((sum, week) => sum + week.historicalPractice.filter((group) => group.requirement === "required").reduce((count, group) => count + group.numbers.length, 0), 0),
}, null, 2));
