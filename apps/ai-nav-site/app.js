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
    summary: "覆盖三维云设计、AI 渲染、智能布置、铺砖、顶墙、水电、橱衣柜、门窗、报价、图纸和生产数据。",
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
    summary: "在线平面云设计，适合做软装搭配、提案文档、家装提案、海报设计，并提供智能抠图和以图搜图。",
    bestFor: "软装设计师、家居门店、运营人员",
    value: "让不会做专业排版的人也能快速做出客户看得懂的提案和活动图。",
    pricing: "有免费素材和模板入口，企业版及版权素材以官网为准。",
    threshold: "低",
    tags: ["提案文档", "软装", "海报"]
  },
  {
    name: "图销AI",
    company: "图销AI",
    domain: "tuxiao.cc",
    url: "https://tuxiao.cc/",
    category: ["design", "materials", "service"],
    priority: "S",
    summary: "面向建材家居商家的 AI 导购效率工具，支持毛坯设计、软装换搭、风格模仿、客户管理和团队管理。",
    bestFor: "建材门店、家具软装、瓷砖地板、家居导购团队",
    value: "门店现场可以快速给客户看效果图，同时沉淀客户需求和跟进记录，适合导购锁客。",
    pricing: "官网以扫码咨询和企业服务为主，价格需咨询。",
    threshold: "低到中",
    tags: ["建材导购", "现场出图", "客户管理"]
  },
  {
    name: "AI室内大师",
    company: "AI室内大师",
    domain: "ai-houses.com",
    url: "https://www.ai-houses.com/",
    category: ["design", "materials"],
    priority: "S",
    summary: "上传现场照片或户型图，一键生成全屋室内装修方案，并提供风格修改、家具材质替换、照明调整等工具。",
    bestFor: "室内设计师、装企销售、家居门店",
    value: "适合在客户还没确定风格时快速出多版方向图，让沟通从抽象描述变成看图选择。",
    pricing: "官网提供在线使用入口，免费额度和付费套餐以官方页面为准。",
    threshold: "低",
    tags: ["室内出图", "换风格", "户型图"]
  },
  {
    name: "建筑学长",
    company: "建筑学长",
    domain: "jianzhuxuezhang.com",
    url: "https://www.jianzhuxuezhang.com/",
    category: ["design", "materials"],
    priority: "A",
    summary: "面向建筑、室内、景观设计师的 AI 绘图与渲染平台，支持文字、草图、底图、模型或图纸截图生成效果图。",
    bestFor: "建筑设计师、室内设计师、设计院、设计学生",
    value: "适合方案早期快速做意向图、材质表达和多风格比稿，也能作为专业设计团队的灵感工具。",
    pricing: "基础功能可免费使用，高级功能、课程和插件等以官方为准。",
    threshold: "中",
    tags: ["建筑渲染", "草图出图", "图纸出图"]
  },
  {
    name: "晓多智能客服",
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
    name: "装修报价计算器",
    company: "装修报价计算器",
    domain: "ijson.com",
    url: "https://www.ijson.com/",
    category: ["budget"],
    priority: "A",
    summary: "按城市、面积、风格和材料等级生成装修预算，结合 AI 分析，输出费用明细和电子报价单。",
    bestFor: "业主预算初筛、装企线索工具",
    value: "适合做获客入口，让客户先留下预算需求，再进入人工跟进。",
    pricing: "公开页显示免费体验 3 次，另有月/年套餐。",
    threshold: "低",
    tags: ["预算", "电子报价", "线索"]
  },
  {
    name: "一装",
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
    tags: ["装企管理", "施工", "结算"]
  },
  {
    name: "掌赋",
    company: "掌赋",
    domain: "wjkj.com",
    url: "https://www.wjkj.com/",
    category: ["project", "service"],
    priority: "A",
    summary: "覆盖客户管理、报价签约、施工交付、供应链、业财一体化、业主服务、流程管控和统计报表。",
    bestFor: "家装公司数字化运营",
    value: "适合想把客户、工地、材料、财务全部在线化的装企。",
    pricing: "手机应用可下载，企业服务需咨询。",
    threshold: "中到高",
    tags: ["客户管理", "工地预警", "业财"]
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
    name: "客源星球",
    company: "江西一客软件科技",
    domain: "应用商店",
    url: "",
    access: "请在手机应用商店搜索“客源星球”下载使用。",
    category: ["marketing"],
    priority: "A",
    summary: "AI 拓客获客手机应用，支持全网获客、地图拓客、附近企业、企业专区、精准客源和批量导出。",
    bestFor: "建材经销商、装企销售、电销团队、地推团队",
    value: "适合找本地商家、楼盘周边企业或泛 B 端客户，用来补充电话销售和地推线索池。",
    pricing: "应用商店显示免费，部分高级功能以应用内实际套餐为准。",
    threshold: "中",
    tags: ["拓客", "地图采集", "线索导出"]
  },
  {
    name: "绿建管家",
    company: "湖北中万信息科技",
    domain: "应用商店",
    url: "",
    access: "请在手机应用商店搜索“绿建管家”下载使用。",
    category: ["marketing", "service", "project"],
    priority: "A",
    summary: "面向建筑建材、钢材、涂料、装修材料行业的获客外呼和客户管理手机应用，包含精准获客、智能外呼、客户管理等能力。",
    bestFor: "建材厂家、经销商、工程材料销售、装修材料门店",
    value: "更偏行业垂直获客和销售管理，适合有外呼、客户池和项目线索跟进需求的团队。",
    pricing: "应用商店显示免费并含应用内购买，企业版价格以应用内为准。",
    threshold: "中到高",
    tags: ["建材获客", "智能外呼", "客户管理"]
  },
  {
    name: "装企客源引擎",
    company: "宁夏乾方策网络",
    domain: "应用商店",
    url: "",
    access: "请在手机应用商店搜索“装企客源引擎”下载使用。",
    category: ["marketing", "service"],
    priority: "B",
    summary: "面向装修公司、家居建材行业的营销裂变获客手机应用，主打业主裂变、品牌推广和家居建材获客推广。",
    bestFor: "装企老板、整装公司、全屋定制、家居建材门店",
    value: "适合把线上活动、品牌推广和客户裂变放到一个移动端工具里做，尤其适合本地装企获客。",
    pricing: "应用商店显示免费，实际服务和增值功能以应用内为准。",
    threshold: "中",
    tags: ["装企获客", "裂变", "推广"]
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
    name: "开拍",
    company: "美图",
    domain: "kaipai.com",
    url: "https://www.kaipai.com/",
    category: ["marketing"],
    priority: "S",
    summary: "AI 口播营销视频工具，支持一句话或一张图制作达人营销视频，也有脚本、字幕、剪辑、去水印、画质修复等能力。",
    bestFor: "门店老板、短视频运营、建材家居销售、直播带货团队",
    value: "适合把产品卖点、门店活动和装修案例快速做成口播短视频，降低老板自己出镜和剪辑门槛。",
    pricing: "官网和手机应用均可使用，免费额度、会员和应用内购买以官方为准。",
    threshold: "低",
    tags: ["口播视频", "实体引流", "AI脚本"]
  },
  {
    name: "说得AI",
    company: "杭州盖视科技",
    domain: "shuodeai.com",
    url: "https://www.shuodeai.com/",
    category: ["marketing"],
    priority: "A",
    summary: "编、拍、演、剪全流程的 AI 口播创作平台，支持数字人、提词器、智能文案、文案提取和智能剪辑。",
    bestFor: "短视频运营、门店老板、招商获客、电商带货",
    value: "适合做产品讲解、老板口播、活动视频和批量广告素材，也能用数字人减少真人出镜压力。",
    pricing: "官网提供手机下载和工作台入口，免费与会员权益以官方为准。",
    threshold: "低到中",
    tags: ["数字人", "提词器", "口播"]
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
    name: "云装天下",
    company: "云立方 / 云装天下",
    domain: "cloudcubic.net",
    url: "https://www.cloudcubic.net/",
    category: ["project"],
    priority: "B",
    summary: "装饰企业管理系统，覆盖销售、客户关系、协同沟通、可视化施工、财务、供应链和渠道。",
    bestFor: "成熟装企、需要多端管理的团队",
    value: "适合把 PC、APP、微信端流程打通。",
    pricing: "需咨询。",
    threshold: "中到高",
    tags: ["企业管理", "供应链", "财务"]
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
const mobileGroups = document.querySelector("#mobileGroups");
const resultSummary = document.querySelector("#resultSummary");
const dialog = document.querySelector("#toolDialog");
const dialogContent = document.querySelector("#dialogContent");
const closeDialog = document.querySelector("#closeDialog");

function categoryLabel(id) {
  return categories.find((item) => item.id === id)?.label || id;
}

function shortSummary(text, length = 32) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
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
  resultSummary.textContent = `${activeLabel} · ${filtered.length} 个工具`;

  if (!filtered.length) {
    toolGrid.innerHTML = `<div class="empty-state">这个分类暂时没有工具。可以先查看其他经营场景。</div>`;
    return;
  }

  toolGrid.innerHTML = filtered
    .map(
      (tool) => `
        <article class="tool-row" data-index="${tools.indexOf(tool)}" role="button" tabindex="0" aria-label="查看 ${tool.name} 详情">
          <h3>${tool.name}</h3>
          <p class="tool-summary">${shortSummary(tool.summary, 54)}</p>
          <div class="tool-meta">
            <span>${tool.company}</span>
            <span class="card-arrow" aria-hidden="true">查看 →</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderMobileGroups() {
  mobileGroups.innerHTML = categories
    .filter((category) => category.id !== "all")
    .map((category) => {
      const groupedTools = tools
        .filter((tool) => tool.category.includes(category.id))
        .sort((a, b) => {
          const order = { S: 0, A: 1, B: 2, C: 3 };
          return order[a.priority] - order[b.priority] || a.name.localeCompare(b.name, "zh-CN");
        });

      if (!groupedTools.length) return "";

      return `
        <section class="mobile-group" aria-label="${category.label}">
          <div class="mobile-group-head">
            <h2>${category.label}</h2>
            <span>${groupedTools.length} 个</span>
          </div>
          <div class="mobile-tool-grid">
            ${groupedTools
              .map(
                (tool) => `
                  <article class="mobile-tool-card" data-index="${tools.indexOf(tool)}" role="button" tabindex="0" aria-label="查看 ${tool.name} 详情">
                    <h3>${tool.name}</h3>
                    <p>${shortSummary(tool.summary, 20)}</p>
                    <span class="mobile-card-arrow" aria-hidden="true">›</span>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderDialog(tool) {
  const accessNote = tool.access || `请在手机应用商店搜索“${tool.name}”下载使用。`;
  const actionBlock = tool.url
    ? `<a class="primary-link" href="${tool.url}" target="_blank" rel="noreferrer">打开官网</a>`
    : `<p class="access-note">${accessNote}</p>`;

  dialogContent.innerHTML = `
    <div class="dialog-head">
      <p class="eyebrow">${tool.category.map(categoryLabel).join(" / ")}</p>
      <h2 id="dialogTitle">${tool.name}</h2>
      <p>${tool.company}</p>
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
        <li>${tool.url ? "正式采购前，建议查看官网的服务范围、商用版权和最新套餐。" : "正式使用前，建议先在应用商店查看最新版本、套餐和隐私说明。"}</li>
      </ul>
    </div>
    <div class="dialog-section">
      ${actionBlock}
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
  const card = event.target.closest("[data-index]");
  if (!card) return;
  renderDialog(tools[Number(card.dataset.index)]);
});

toolGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-index]");
  if (!card) return;
  event.preventDefault();
  renderDialog(tools[Number(card.dataset.index)]);
});

mobileGroups.addEventListener("click", (event) => {
  const card = event.target.closest("[data-index]");
  if (!card) return;
  renderDialog(tools[Number(card.dataset.index)]);
});

mobileGroups.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-index]");
  if (!card) return;
  event.preventDefault();
  renderDialog(tools[Number(card.dataset.index)]);
});

closeDialog.addEventListener("click", () => dialog.close());

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

renderFilters();
renderTools();
renderMobileGroups();
