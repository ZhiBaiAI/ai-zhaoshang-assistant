const categories = [
  { id: "all", label: "全部", short: "完整浏览全部工具" },
  { id: "outbound", label: "AI外呼获客", short: "找客户、筛客户、跟进客户" },
  { id: "meeting", label: "AI语音纪要", short: "会议录音、访谈整理、跟进记录" },
  { id: "video", label: "AI视频获客", short: "短视频、口播、内容引流" },
  { id: "design", label: "家装设计", short: "效果图、方案图、材料搭配" },
  { id: "service", label: "AI智能客服", short: "私信接待、网站客服、自动回复" }
];

const categoryToolOrder = {
  outbound: ["云蝠智能", "来鼓AI", "快商通 AI 私信留资机器人", "客源星球", "绿建管家", "美洽", "语聚AI", "装企客源引擎"],
  meeting: ["讯飞听见", "GET笔记"],
  video: ["即梦 AI", "说得AI", "开拍", "剪映"],
  design: ["AI室内大师", "建筑学长", "酷家乐 AI", "三维家", "图销AI", "美间"],
  service: ["来鼓AI", "米多客", "美洽", "3Chat.ai", "语聚AI", "晓多智能客服", "快商通 AI 私信留资机器人", "图销AI", "云蝠智能", "绿建管家"]
};

const tools = [
  {
    name: "酷家乐 AI",
    company: "酷家乐 / 群核科技",
    domain: "kujiale.com",
    url: "https://www.kujiale.com/hc/article/3FO4K4WPVV8V",
    category: ["design"],
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
    category: ["design"],
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
    category: ["design"],
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
    category: ["design", "service"],
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
    category: ["design"],
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
    category: ["design"],
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
    category: ["service"],
    priority: "S",
    summary: "面向电商和多平台客服的 AI 接待系统，支持聚合接待、商品推荐、知识库、质检和客户运营。",
    bestFor: "建材电商、家具家电商家、多平台店铺",
    value: "把重复咨询交给 AI，减少漏接，客服可以把精力放在高意向客户上。",
    pricing: "官网提供免费试用，正式订购需咨询。",
    threshold: "中",
    tags: ["电商客服", "商品推荐", "多平台"]
  },
  {
    name: "来鼓AI",
    company: "来鼓AI",
    domain: "laigu.com",
    url: "https://laigu.com/",
    category: ["service", "outbound"],
    priority: "S",
    summary: "面向小红书、抖音、快手等平台的获客和智能客服工具，支持私信评论聚合、客服分流、自动追粉和 AI 数字员工。",
    bestFor: "短视频获客团队、小红书运营、装企私信接待、门店客服",
    value: "把多平台私信和评论集中处理，减少漏回，同时用 AI 员工承接高频咨询和留资引导。",
    pricing: "官网提供免费试用入口，正式套餐以官方报价为准。",
    threshold: "中",
    tags: ["私信聚合", "评论获客", "AI员工"]
  },
  {
    name: "米多客",
    company: "米多客",
    domain: "miduoke.net",
    url: "https://www.miduoke.net/",
    category: ["service"],
    priority: "A",
    summary: "全渠道在线客服系统，支持网站、微信、公众号、小程序、抖音等渠道，并提供 AI 客服、工单、质检和统计分析。",
    bestFor: "建材官网、电商店铺、装企客服团队、售后服务团队",
    value: "把网站、社媒和私域咨询统一接待，常见问题交给智能客服先回复，人工集中处理高意向客户。",
    pricing: "官网提供免费试用和客户端下载，企业版价格以官方为准。",
    threshold: "中",
    tags: ["在线客服", "全渠道", "工单"]
  },
  {
    name: "美洽",
    company: "美洽",
    domain: "meiqia.com",
    url: "https://www.meiqia.com/",
    category: ["service", "outbound"],
    priority: "A",
    summary: "智能客服和获客机器人平台，支持网页、小程序、公众号等渠道接入，提供自动应答、知识库、线索获取和数据洞察。",
    bestFor: "品牌官网、建材电商、装企咨询台、售前客服",
    value: "适合把官网访客和线上咨询转成有效线索，同时降低客服重复答疑压力。",
    pricing: "官网提供试用和咨询入口，具体套餐以官方报价为准。",
    threshold: "中",
    tags: ["获客机器人", "在线客服", "线索"]
  },
  {
    name: "3Chat.ai",
    company: "纽酷科技",
    domain: "3chat.ai",
    url: "https://www.3chat.ai/",
    category: ["service"],
    priority: "A",
    summary: "能动性 AI 客服智能体，支持知识库问答、全渠道消息聚合、客户画像、预约、拉群和售后等业务动作。",
    bestFor: "私域运营、线上客服、跨平台店铺、售前咨询团队",
    value: "不只是自动回复，还能把咨询推进到预约、留资、拉群和售后处理，适合想做客服转化闭环的团队。",
    pricing: "官网公开成长版、专业版、企业版等套餐，具体价格以官网为准。",
    threshold: "中",
    tags: ["智能体客服", "全渠道", "私域转化"]
  },
  {
    name: "语聚AI",
    company: "北京集简慧通互联科技",
    domain: "yuju-ai.com",
    url: "https://yuju-ai.com/about.html",
    category: ["service", "outbound"],
    priority: "A",
    summary: "一站式 AI 客服和营销助手平台，连接企业知识库、沟通渠道和业务系统，支持自动回复、留资、下单引导和流程自动化。",
    bestFor: "需要多平台客服、自动化营销、私域运营的建材家居商家",
    value: "适合把小红书、抖音、微信等渠道的咨询和业务系统打通，让 AI 帮忙回复、分流和沉淀客户信息。",
    pricing: "官网提供免费试用入口，企业方案以官方沟通为准。",
    threshold: "中到高",
    tags: ["自动化营销", "多渠道客服", "知识库"]
  },
  {
    name: "讯飞听见",
    company: "科大讯飞",
    domain: "iflyrec.com",
    url: "https://www.iflyrec.com/",
    category: ["meeting"],
    priority: "S",
    summary: "AI 语音记录助手，支持实时录音、导入音频转文字、说话人区分、AI 整理会议纪要和多语种翻译。",
    bestFor: "老板会议、客户沟通、设计交底、工地复盘、招商培训",
    value: "把会议和客户沟通自动转成文字与纪要，方便后续跟进需求、报价、任务和责任人。",
    pricing: "官网可在线使用，免费额度和付费服务以官方页面为准。",
    threshold: "低",
    tags: ["会议纪要", "录音转文字", "任务整理"]
  },
  {
    name: "GET笔记",
    company: "得到",
    domain: "应用商店",
    url: "",
    access: "请在手机应用商店搜索“GET笔记”下载使用。",
    category: ["meeting"],
    priority: "A",
    summary: "AI 智能笔记应用，支持语音、图片、链接和文字记录，能自动转写、润色、总结，并支持基于笔记内容搜索问答。",
    bestFor: "老板随手记录、销售复盘、客户需求整理、会议重点沉淀",
    value: "适合把零散想法、客户沟通和会议录音随手记录下来，后续快速整理成可执行事项。",
    pricing: "应用商店显示免费，会员和应用内购买以实际页面为准。",
    threshold: "低",
    tags: ["手机笔记", "语音记录", "智能搜索"]
  },
  {
    name: "云蝠智能",
    company: "云蝠智能",
    domain: "ccgpt.net",
    url: "https://www.ccgpt.net/",
    category: ["outbound", "service"],
    priority: "S",
    summary: "大模型语音智能体和 AI 呼叫中心，支持语音外呼、智能呼入、人机协同、客户跟进和营销触达。",
    bestFor: "装企电销团队、建材厂家招商、门店回访、沉睡客户唤醒",
    value: "适合需要批量电话触达、客户回访、活动通知和意向筛选的团队，让人工销售优先跟进高意向客户。",
    pricing: "官网提供注册体验和方案咨询，企业价格以官方沟通为准。",
    threshold: "中到高",
    tags: ["语音外呼", "客户回访", "意向筛选"]
  },
  {
    name: "快商通 AI 私信留资机器人",
    company: "快商通",
    domain: "kuaishang.cn",
    url: "https://www.kuaishang.cn/",
    category: ["outbound", "service"],
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
    category: ["outbound"],
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
    category: ["outbound", "service"],
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
    category: ["outbound"],
    priority: "B",
    summary: "面向装修公司、家居建材行业的营销裂变获客手机应用，主打业主裂变、品牌推广和家居建材获客推广。",
    bestFor: "装企老板、整装公司、全屋定制、家居建材门店",
    value: "适合把线上活动、品牌推广和客户裂变放到一个移动端工具里做，尤其适合本地装企获客。",
    pricing: "应用商店显示免费，实际服务和增值功能以应用内为准。",
    threshold: "中",
    tags: ["装企获客", "裂变", "推广"]
  },
  {
    name: "即梦 AI",
    company: "字节跳动 / 剪映生态",
    domain: "jianying.com",
    url: "https://jimeng.jianying.com/",
    category: ["video"],
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
    category: ["video"],
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
    category: ["video"],
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
    category: ["video"],
    priority: "A",
    summary: "编、拍、演、剪全流程的 AI 口播创作平台，支持数字人、提词器、智能文案、文案提取和智能剪辑。",
    bestFor: "短视频运营、门店老板、招商获客、电商带货",
    value: "适合做产品讲解、老板口播、活动视频和批量广告素材，也能用数字人减少真人出镜压力。",
    pricing: "官网提供手机下载和工作台入口，免费与会员权益以官方为准。",
    threshold: "低到中",
    tags: ["数字人", "提词器", "口播"]
  },
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

function categoryPosition(categoryId) {
  const index = categories.findIndex((item) => item.id === categoryId);
  return index === -1 ? 999 : index;
}

function primaryCategory(tool) {
  return tool.category
    .filter((categoryId) => categoryId !== "all")
    .sort((a, b) => categoryPosition(a) - categoryPosition(b))[0];
}

function toolPosition(tool, categoryId) {
  const orderedNames = categoryToolOrder[categoryId] || [];
  const index = orderedNames.indexOf(tool.name);
  return index === -1 ? 999 : index;
}

function sortTools(toolList, categoryId) {
  const priorityOrder = { S: 0, A: 1, B: 2, C: 3 };

  return [...toolList].sort((a, b) => {
    const activeCategory = categoryId === "all" ? primaryCategory(a) : categoryId;
    const comparedCategory = categoryId === "all" ? primaryCategory(b) : categoryId;
    const categoryDiff = categoryPosition(activeCategory) - categoryPosition(comparedCategory);
    if (categoryDiff) return categoryDiff;

    const positionDiff = toolPosition(a, activeCategory) - toolPosition(b, comparedCategory);
    if (positionDiff) return positionDiff;

    return priorityOrder[a.priority] - priorityOrder[b.priority] || a.name.localeCompare(b.name, "zh-CN");
  });
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
  return sortTools(
    tools.filter((tool) => state.category === "all" || tool.category.includes(state.category)),
    state.category
  );
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
        .filter((tool) => tool.category.includes(category.id));
      const sortedTools = sortTools(groupedTools, category.id);

      if (!groupedTools.length) return "";

      return `
        <section class="mobile-group" aria-label="${category.label}">
          <div class="mobile-group-head">
            <h2>${category.label}</h2>
            <span>${groupedTools.length} 个</span>
          </div>
          <div class="mobile-tool-grid">
            ${sortedTools
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
