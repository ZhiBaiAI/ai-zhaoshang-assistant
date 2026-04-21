const categories = [
  { id: "all", label: "全部", short: "完整浏览全部工具" },
  { id: "design", label: "出效果图", short: "让方案更容易成交" },
  { id: "materials", label: "选材料", short: "让客户更快决定" },
  { id: "budget", label: "算预算", short: "让报价更快更清楚" },
  { id: "project", label: "管工地", short: "让项目推进更稳" },
  { id: "service", label: "接客服", short: "减少漏接和重复回复" },
  { id: "marketing", label: "做获客", short: "让内容和线索更快跑起来" },
  { id: "office", label: "办公助手", short: "让日常工作更高效" }
];

const tools = [
  {
    name: "酷家乐 AI",
    company: "酷家乐 / 群核科技",
    domain: "kujiale.com",
    url: "https://www.kujiale.com/hc/article/3FO4K4WPVV8V",
    category: ["design", "materials", "budget"],
    priority: "S",
    summary: "上传房间、毛坯房或手绘图，快速生成不同装修风格效果图，也能做局部修改、家具试搭和高清升级。",
    bestFor: "家装设计师、装企销售、门店导购",
    value: "量房现场能先给客户看方向，降低沟通成本，适合拿来做谈单工具。",
    pricing: "有免费体验和会员权益，具体额度以官网为准。",
    threshold: "低到中",
    tags: ["毛坯出图", "局部修改", "谈单"]
  },
  {
    name: "三维家",
    company: "广东三维家",
    domain: "3vjia.com",
    url: "https://www.3vjia.com/",
    category: ["design", "materials", "budget"],
    priority: "S",
    summary: "覆盖 3D 云设计、AI 渲染、智能布置、铺砖、顶墙、水电、橱衣柜、门窗、报价、图纸和生产数据。",
    bestFor: "定制家居、瓷砖卫浴、门窗、装企门店",
    value: "从设计到报价、下单、生产更容易打通，适合有门店和工厂流程的企业。",
    pricing: "官网显示可免费使用/试用，企业方案需咨询。",
    threshold: "中到高",
    tags: ["设计生产一体", "铺砖", "定制家具"]
  },
  {
    name: "美间",
    company: "美间 / 群核生态",
    domain: "meijian.com",
    url: "https://www.meijian.com/",
    category: ["design", "materials", "marketing"],
    priority: "S",
    summary: "在线 2D 云设计，适合做软装搭配、提案 PPT、家装提案、海报设计，并提供智能抠图和以图搜图。",
    bestFor: "软装设计师、家居门店、运营人员",
    value: "让不会做专业排版的人也能快速做出客户看得懂的提案和活动图。",
    pricing: "有免费素材和模板入口，企业版及版权素材以官网为准。",
    threshold: "低",
    tags: ["提案PPT", "软装", "海报"]
  },
  {
    name: "RoomDreaming",
    company: "梦建科技",
    domain: "roomdreaming.com",
    url: "https://www.roomdreaming.com/zh-CN/solutions/visualizer/tiles",
    category: ["materials"],
    priority: "S",
    summary: "让客户上传自家空间照片，直接预览瓷砖、地板、涂料、石材、台面等建材铺到家里的效果。",
    bestFor: "建材品牌、经销商、展厅、电商",
    value: "客户不用靠想象选材料，能减少犹豫、退换货和门店讲解压力。",
    pricing: "企业合作和预约演示为主，价格需咨询。",
    threshold: "中",
    tags: ["瓷砖", "地板", "涂料", "展厅"]
  },
  {
    name: "晓多 AI-Agent",
    company: "晓多科技",
    domain: "xiaoduoai.com",
    url: "https://www.xiaoduoai.com/",
    category: ["service", "materials"],
    priority: "S",
    summary: "面向电商和多平台客服的 AI 接待系统，支持聚合接待、商品推荐、知识库、质检和客户运营。",
    bestFor: "建材电商、家具家电商家、多平台店铺",
    value: "把重复咨询交给 AI，减少漏接，客服可以把精力放在高意向客户上。",
    pricing: "官网提供免费试用，正式订购需咨询。",
    threshold: "中",
    tags: ["电商客服", "商品推荐", "多平台"]
  },
  {
    name: "Homestyler",
    company: "Homestyler / 居然设计家",
    domain: "homestyler.com",
    url: "https://www.homestyler.com/",
    category: ["design"],
    priority: "A",
    summary: "上传平面图或草图转 3D 模型，拖拽家具模型，做云渲染、VR/AR 展示。",
    bestFor: "DIY 业主、室内设计师、地产展示",
    value: "适合做快速空间表达，也适合需要英文和海外用户的业务。",
    pricing: "官网定位免费 3D 室内设计软件，进阶权益以官网为准。",
    threshold: "低到中",
    tags: ["户型转3D", "家具模型", "云渲染"]
  },
  {
    name: "Coohom",
    company: "Coohom / 群核国际版",
    domain: "coohom.com",
    url: "https://www.coohom.com/",
    category: ["design"],
    priority: "A",
    summary: "提供 2D/3D 家装设计、AI Home Design、智能布局、实时渲染和模型库。",
    bestFor: "海外家居设计、跨境家居品牌",
    value: "适合做英文市场或海外客户的设计展示。",
    pricing: "官网有 Start for Free，进阶订阅和企业方案以官网为准。",
    threshold: "中",
    tags: ["海外", "3D设计", "实时渲染"]
  },
  {
    name: "LookX AI",
    company: "LookX",
    domain: "lookx.ai",
    url: "https://www.lookx.ai/",
    category: ["design"],
    priority: "A",
    summary: "面向建筑和室内设计的 AI 平台，支持草图转渲染、实时生成、视频生成、自训练模型、SketchUp/Rhino 插件。",
    bestFor: "专业设计师、建筑室内表现团队",
    value: "概念阶段可以快速试不同风格，提高方案表现效率。",
    pricing: "官网显示可免费开始，进阶套餐以官网为准。",
    threshold: "中到高",
    tags: ["建筑表现", "SU插件", "Rhino"]
  },
  {
    name: "Veras",
    company: "EvolveLAB / Chaos",
    domain: "evolvelab.io",
    url: "https://www.evolvelab.io/veras",
    category: ["design"],
    priority: "A",
    summary: "AI 可视化插件和 Web App，支持 SketchUp、Revit、Rhino、Archicad、Vectorworks 等设计软件。",
    bestFor: "BIM/CAD 设计师、方案汇报团队",
    value: "能在设计软件里直接出图，适合专业团队保留模型结构做多版视觉方案。",
    pricing: "官网显示 15 天/30 renders 试用，月付和年付订阅。",
    threshold: "高",
    tags: ["Revit", "SketchUp", "专业渲染"]
  },
  {
    name: "ReimagineHome",
    company: "Styldod",
    domain: "reimaginehome.ai",
    url: "https://www.reimaginehome.ai/",
    category: ["design", "materials"],
    priority: "A",
    summary: "上传空间照片做虚拟布置、室内翻新、庭院改造、物体移除、换墙漆，也能按预算生成商品方案。",
    bestFor: "房产经纪、软装搭配、海外家居电商",
    value: "适合让客户先看到改造后的样子，再决定是否购买或装修。",
    pricing: "官网显示前 3 个设计免费，无需信用卡。",
    threshold: "低",
    tags: ["虚拟布置", "换墙漆", "商品方案"]
  },
  {
    name: "装修报价计算器 DecoCalc",
    company: "DecoCalc",
    domain: "ijson.com",
    url: "https://www.ijson.com/",
    category: ["budget"],
    priority: "A",
    summary: "按城市、面积、风格和材料等级生成装修预算，结合 AI 分析，输出费用明细和 PDF 报价单。",
    bestFor: "业主预算初筛、装企线索工具",
    value: "适合做获客入口，让客户先留下预算需求，再进入人工跟进。",
    pricing: "公开页显示免费体验 3 次，另有月/年套餐。",
    threshold: "低",
    tags: ["预算", "PDF报价", "线索"]
  },
  {
    name: "一装 ERP",
    company: "成都一装科技",
    domain: "1zerp.com",
    url: "https://www.1zerp.com/",
    category: ["project"],
    priority: "A",
    summary: "覆盖客户、合作商、项目、员工管理，适用于传统家装、精装房、工装业务。",
    bestFor: "中小装企、工装公司",
    value: "把签单、施工、材料、结算放到一套流程里，减少老板靠微信群盯进度。",
    pricing: "官网提供免费试用。",
    threshold: "中",
    tags: ["装企ERP", "施工", "结算"]
  },
  {
    name: "掌赋 SaaS",
    company: "掌赋",
    domain: "wjkj.com",
    url: "https://www.wjkj.com/",
    category: ["project", "service"],
    priority: "A",
    summary: "覆盖 CRM、报价签约、施工交付、供应链、业财一体化、业主服务、流程管控和统计报表。",
    bestFor: "家装公司数字化运营",
    value: "适合想把客户、工地、材料、财务全部在线化的装企。",
    pricing: "App 可下载，SaaS 服务需咨询。",
    threshold: "中到高",
    tags: ["CRM", "工地预警", "业财"]
  },
  {
    name: "快商通 AI 私信留资机器人",
    company: "快商通",
    domain: "kuaishang.cn",
    url: "https://www.kuaishang.cn/",
    category: ["service", "marketing"],
    priority: "A",
    summary: "面向装修行业私信获客，支持线索留资、话术跟进、数据回传和营销转化。",
    bestFor: "装企短视频获客、广告私信接待",
    value: "广告带来的私信不再靠人工慢慢回，先筛出有意向客户。",
    pricing: "需咨询。",
    threshold: "中",
    tags: ["私信获客", "留资", "短视频"]
  },
  {
    name: "ChatGPT",
    company: "OpenAI",
    domain: "openai.com",
    url: "https://openai.com/chatgpt/pricing/",
    category: ["office", "marketing"],
    priority: "S",
    summary: "通用 AI 助手，能写文案、读文件、做表格分析、生成图片、联网搜索和整理资料。",
    bestFor: "老板、运营、设计师、客服主管",
    value: "适合做方案文案、客户话术、活动策划、报价单解读和营销内容生产。",
    pricing: "官网显示有 Free，Plus、Pro、Business 等付费版。",
    threshold: "低",
    tags: ["写文案", "读文件", "资料整理"]
  },
  {
    name: "DeepSeek",
    company: "深度求索",
    domain: "deepseek.com",
    url: "https://chat.deepseek.com/",
    category: ["office", "budget"],
    priority: "S",
    summary: "中文推理和写作能力强的通用 AI，适合做表格、清单、问答和代码辅助。",
    bestFor: "预算员、运营、客服知识库整理",
    value: "可低成本生成预算表、验收清单、客服话术草稿，但价格和材料用量要人工复核。",
    pricing: "Chat 网页常用免费，API 价格需看官方平台。",
    threshold: "低",
    tags: ["预算表", "清单", "中文"]
  },
  {
    name: "Kimi",
    company: "月之暗面",
    domain: "kimi.com",
    url: "https://www.kimi.com/",
    category: ["office", "marketing"],
    priority: "S",
    summary: "擅长长文本和文件阅读，可做联网搜索、资料摘要、文档问答、PPT/表格相关工作。",
    bestFor: "市场、老板、资料整理人员",
    value: "适合读取品牌手册、施工规范、合同和竞品网页，快速整理成老板能看的结论。",
    pricing: "有免费入口，会员/API 以官网为准。",
    threshold: "低",
    tags: ["长文档", "搜索", "总结"]
  },
  {
    name: "通义千问",
    company: "阿里",
    domain: "qianwen.com",
    url: "https://www.qianwen.com/qianwen/",
    category: ["office", "marketing", "service"],
    priority: "S",
    summary: "阿里旗下全能 AI 助手，适合中文问答、写作、办公、图片理解和生态对接。",
    bestFor: "建材电商、运营、客服主管",
    value: "适合做产品详情页、直播脚本、客服话术、表格清单和阿里生态业务。",
    pricing: "有免费入口，企业/API 以官网为准。",
    threshold: "低",
    tags: ["中文办公", "电商", "话术"]
  },
  {
    name: "豆包",
    company: "字节跳动",
    domain: "doubao.com",
    url: "https://www.doubao.com/",
    category: ["office", "marketing"],
    priority: "S",
    summary: "支持 AI 写作、翻译、文档、搜索、图像生成，适合抖音和剪映生态内容生产。",
    bestFor: "短视频运营、小红书运营、老板助理",
    value: "能快速产出装修避坑文案、短视频分镜、门店活动文案和客户沟通话术。",
    pricing: "有免费入口，付费权益以官网为准。",
    threshold: "低",
    tags: ["抖音", "文案", "图像"]
  },
  {
    name: "Canva 可画",
    company: "Canva",
    domain: "canva.com",
    url: "https://www.canva.com/",
    category: ["marketing"],
    priority: "S",
    summary: "模板设计、AI 图片、AI 文案、排版和品牌套件，适合快速做营销物料。",
    bestFor: "门店运营、市场部、老板助理",
    value: "不会设计也能做活动海报、小红书封面、门店宣传图和 PPT。",
    pricing: "有免费版，Pro/团队版付费。",
    threshold: "低",
    tags: ["海报", "PPT", "模板"]
  },
  {
    name: "稿定设计",
    company: "稿定",
    domain: "gaoding.com",
    url: "https://www.gaoding.com/",
    category: ["marketing"],
    priority: "S",
    summary: "中文模板设计平台，支持海报、电商图、抠图、商品图和营销图制作。",
    bestFor: "建材门店、电商运营、活动策划",
    value: "适合快速做朋友圈海报、主图、促销图和门店物料。",
    pricing: "免费加会员模式，商用素材以官网为准。",
    threshold: "低",
    tags: ["中文模板", "电商图", "抠图"]
  },
  {
    name: "即梦 AI",
    company: "字节跳动 / 剪映生态",
    domain: "jianying.com",
    url: "https://jimeng.jianying.com/",
    category: ["marketing", "design"],
    priority: "S",
    summary: "AI 图片和视频生成工具，支持文生图、图生图、图生视频等创意能力。",
    bestFor: "短视频运营、设计师、品牌营销",
    value: "适合做装修风格图、短视频封面、空间氛围短片和产品场景图。",
    pricing: "免费/积分/会员权益以官网为准。",
    threshold: "低",
    tags: ["AI图片", "AI视频", "封面"]
  },
  {
    name: "剪映",
    company: "字节跳动",
    domain: "capcut.cn",
    url: "https://www.capcut.cn/",
    category: ["marketing"],
    priority: "S",
    summary: "视频剪辑、字幕、模板、脚本、配音、数字人等能力，适合短视频生产。",
    bestFor: "抖音、视频号、小红书运营",
    value: "装修案例、工地巡检、材料测评、客户口碑都能快速剪成短视频。",
    pricing: "免费加会员模式。",
    threshold: "低",
    tags: ["短视频", "字幕", "模板"]
  },
  {
    name: "可灵 AI",
    company: "快手",
    domain: "kuaishou.com",
    url: "https://klingai.kuaishou.com/",
    category: ["marketing"],
    priority: "A",
    summary: "AI 视频、图片生成和图生视频工具，适合生成视觉素材和短片。",
    bestFor: "品牌营销、短视频运营",
    value: "可用于装修案例短视频、产品场景动画和活动视频素材。",
    pricing: "免费/会员/积分以官网为准。",
    threshold: "低",
    tags: ["AI视频", "场景动画", "素材"]
  },
  {
    name: "RoomGPT",
    company: "RoomGPT",
    domain: "roomgpt.io",
    url: "https://www.roomgpt.io/",
    category: ["design"],
    priority: "B",
    summary: "上传房间照片，一键生成不同主题的房间改造效果图。",
    bestFor: "业主自测、设计灵感、社媒内容",
    value: "简单快，适合用作灵感工具，不适合直接替代专业落地方案。",
    pricing: "公开页可直接试用，具体额度以官网为准。",
    threshold: "低",
    tags: ["灵感图", "房间改造", "快速"]
  },
  {
    name: "Planner 5D AI",
    company: "Planner 5D",
    domain: "planner5d.com",
    url: "https://planner5d.com/ai",
    category: ["design", "budget"],
    priority: "B",
    summary: "支持把 PNG、JPG、PDF、DWG、DXF 等户型或蓝图转换为 3D 模型，也有自动家具布置和估算工具。",
    bestFor: "DIY 业主、海外设计内容、设计教育",
    value: "适合英文场景和户型转 3D 的补充工具。",
    pricing: "有免费试用，完整功能需订阅。",
    threshold: "中",
    tags: ["蓝图转3D", "海外", "户型"]
  },
  {
    name: "Luw.ai",
    company: "Luw.ai",
    domain: "luw.ai",
    url: "https://luw.ai/cn/",
    category: ["design"],
    priority: "B",
    summary: "室内和外立面 AI 改造，照片转方案，也提供建筑 GPT 对话建议。",
    bestFor: "业主灵感、外立面和庭院初稿",
    value: "适合快速生成改造方向，用作设计沟通前的参考。",
    pricing: "官网显示可免费开始，实际额度以官网为准。",
    threshold: "低",
    tags: ["外立面", "庭院", "灵感"]
  },
  {
    name: "云装天下 ERP",
    company: "云立方 / 云装天下",
    domain: "cloudcubic.net",
    url: "https://www.cloudcubic.net/",
    category: ["project"],
    priority: "B",
    summary: "装饰企业 ERP，覆盖销售、客户关系、协同沟通、可视化施工、财务、供应链和渠道。",
    bestFor: "成熟装企、需要多端管理的团队",
    value: "适合把 PC、APP、微信端流程打通。",
    pricing: "需咨询。",
    threshold: "中到高",
    tags: ["ERP", "供应链", "财务"]
  },
  {
    name: "美佳云装",
    company: "创软科技",
    domain: "zxerp.com",
    url: "https://www.zxerp.com/",
    category: ["project"],
    priority: "B",
    summary: "覆盖客户跟单、预算报价、财务收款、施工进度、材料成本、材料商接单、工人派工和业主查看进度。",
    bestFor: "家装、工装、精装修公司",
    value: "适合传统装企把工地、材料、业主验收和财务串起来。",
    pricing: "需咨询。",
    threshold: "中",
    tags: ["预算报价", "派工", "业主端"]
  }
];

const state = {
  category: "all"
};

const categoryFilters = document.querySelector("#categoryFilters");
const toolGrid = document.querySelector("#toolGrid");
const resultSummary = document.querySelector("#resultSummary");
const dialog = document.querySelector("#toolDialog");
const dialogContent = document.querySelector("#dialogContent");
const closeDialog = document.querySelector("#closeDialog");

function logoData(name, priority) {
  const colors = {
    S: ["#0b57d0", "#e8f0fe"],
    A: ["#188038", "#e6f4ea"],
    B: ["#b06000", "#fef7e0"],
    C: ["#d93025", "#fce8e6"]
  };
  const [ink, bg] = colors[priority] || colors.B;
  const initials = Array.from(name.replace(/\s+/g, "")).slice(0, 2).join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="8" fill="${bg}"/>
      <rect x="10" y="10" width="44" height="44" rx="8" fill="#ffffff" opacity="0.9"/>
      <text x="32" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="${ink}">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function categoryLabel(id) {
  return categories.find((item) => item.id === id)?.label || id;
}

function fitLabel(priority) {
  return {
    S: "适合起步",
    A: "适合团队",
    B: "按需补充",
    C: "了解一下"
  }[priority] || "可了解";
}

function renderFilters() {
  categoryFilters.innerHTML = categories
    .map((category) => {
      const count =
        category.id === "all"
          ? tools.length
          : tools.filter((tool) => tool.category.includes(category.id)).length;

      return `
        <button class="filter-chip ${state.category === category.id ? "active" : ""}" data-category="${category.id}" type="button">
          ${category.label}<span>${count}</span>
        </button>
      `;
    })
    .join("");
}

function getFilteredTools() {
  return tools
    .filter((tool) => state.category === "all" || tool.category.includes(state.category))
    .sort((a, b) => {
      const order = { S: 0, A: 1, B: 2, C: 3 };
      return order[a.priority] - order[b.priority] || a.name.localeCompare(b.name, "zh-CN");
    });
}

function renderTools() {
  const filtered = getFilteredTools();
  const activeLabel = categoryLabel(state.category);
  resultSummary.textContent = `当前分类：${activeLabel}，共 ${filtered.length} 个工具。建议先看“适合起步”的产品。`;

  if (!filtered.length) {
    toolGrid.innerHTML = `<div class="empty-state">这个分类暂时没有工具。可以先查看其他经营场景。</div>`;
    return;
  }

  toolGrid.innerHTML = filtered
    .map(
      (tool) => `
        <article class="tool-row">
          <div class="tool-main">
            <div class="tool-head">
              <img class="tool-logo" src="${logoData(tool.name, tool.priority)}" alt="${tool.name} 图标" loading="lazy">
              <div class="tool-title">
                <div class="tool-title-line">
                  <h3>${tool.name}</h3>
                  <span class="fit-badge">${fitLabel(tool.priority)}</span>
                </div>
                <small>${tool.company}</small>
              </div>
            </div>
            <p class="tool-summary">${tool.summary}</p>
          </div>
          <div class="tool-card-bottom">
            <div class="tag-row">
              ${tool.category.slice(0, 2).map((id) => `<span class="tag">${categoryLabel(id)}</span>`).join("")}
            </div>
            <div class="tool-actions">
              <button class="secondary-button" type="button" data-index="${tools.indexOf(tool)}">详情</button>
              <a class="primary-link" href="${tool.url}" target="_blank" rel="noreferrer">官网</a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDialog(tool) {
  dialogContent.innerHTML = `
    <div class="dialog-head">
      <img src="${logoData(tool.name, tool.priority)}" alt="${tool.name} 图标">
      <div>
        <p class="eyebrow">${fitLabel(tool.priority)} · ${tool.category.map(categoryLabel).join(" / ")}</p>
        <h2 id="dialogTitle">${tool.name}</h2>
        <p>${tool.company}</p>
      </div>
    </div>
    <div class="dialog-section">
      <h3>一句话说明</h3>
      <p>${tool.summary}</p>
    </div>
    <div class="dialog-section">
      <h3>老板最关心的价值</h3>
      <p>${tool.value}</p>
    </div>
    <div class="dialog-section">
      <h3>适合谁用</h3>
      <p>${tool.bestFor}</p>
    </div>
    <div class="dialog-section">
      <h3>免费情况和门槛</h3>
      <ul class="dialog-list">
        <li>免费/价格：${tool.pricing}</li>
        <li>上手门槛：${tool.threshold}</li>
        <li>正式采购前，建议查看官网的服务范围、商用版权和最新套餐。</li>
      </ul>
    </div>
    <div class="dialog-section">
      <h3>标签</h3>
      <div class="tag-row">${tool.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    </div>
    <div class="dialog-section">
      <a class="primary-link" href="${tool.url}" target="_blank" rel="noreferrer">打开官网</a>
    </div>
  `;
  dialog.showModal();
}

categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderTools();
});

toolGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  renderDialog(tools[Number(button.dataset.index)]);
});

closeDialog.addEventListener("click", () => dialog.close());

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

renderFilters();
renderTools();
