/* =====================================================================
   TREVITY KOC 营销秘籍(中文版)申请 — 保存到 Google 表格 + 通知老板 + 自动发送中文 PDF
   ─────────────────────────────────────────────────────────────────────
   [部署 / 更新方法]  ── PDF 已放在 landing-cn 文件夹(trevity-koc-ebook-cn.pdf)
   1) git push trevity-landing-cn  → PDF 在 GitHub Pages 上线
        (确认:浏览器打开 EBOOK_URL 能看到 PDF 即可)
   2) https://script.google.com → 新建项目 → 粘贴此代码 → 保存
   3) 运行 setup → 授权(邮件·外部请求权限)
        (日志出现 "秘籍 URL 响应码: 200 (正常)" 即准备完成)
   4) 运行 testSendToSelf → 测试本人邮箱能否收到秘籍
   5) [部署] → 新建部署 → 网页应用 / 执行身份:我 / 访问:任何人
      → 复制 /exec URL,粘贴到 index.html 的 SHEET_ENDPOINT
   ★ 这是与韩文版完全独立的项目 / 独立表格 / 发送中文 PDF
   ===================================================================== */

var SHEET_NAME    = '申请';
var NOTIFY_EMAIL  = 'meeneex2@gmail.com';                 // 老板(接收申请通知)
var SENDER_NAME   = 'TREVITY';                            // 申请人看到的发件人名(用 ASCII 稳妥)

var REPLY_TO   = 'notice@trevity.com';                    // 回复地址
var FROM_ALIAS = '';                                       // 留空:用 Gmail 发送(到达率稳定)

var LANDING_URL   = 'https://leegunhee010.github.io/trevity-landing-cn/';

/* 中文秘籍 PDF 来源 */
var EBOOK_URL     = 'https://leegunhee010.github.io/trevity-landing-cn/trevity-koc-ebook-cn.pdf';
var EBOOK_FILE_ID = '';
var EBOOK_FILENAME = 'Trevity_Vietnam_KOC_Marketing_Guide_CN.pdf';  // 附件名用英文(ASCII),避免部分邮箱显示乱码

var HEADERS = ['申请时间','姓名','店名','行业','电话','邮箱','备注','秘籍发送'];

function doPost(e){
  try{
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);

    var p   = (e && e.parameter) || {};
    var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');

    var sent = sendEbook_(p);
    var sentMark = (sent === true) ? 'O' : ('X(' + sent + ')');

    var sh = getSheet_();
    sh.appendRow([
      now,
      p['姓名'] || '',
      p['店名'] || '',
      p['行业'] || '',
      p['电话'] || '',
      p['邮箱'] || '',
      p['备注'] || '',
      sentMark
    ]);
    lock.releaseLock();

    notify_(p, now, sentMark);
    return json_({ result:'success', sent:sentMark });
  }catch(err){
    return json_({ result:'error', message:String(err) });
  }
}

function doGet(){
  return json_({ result:'ok', sheet: getSheet_().getParent().getUrl() });
}

function setup(){
  var url = getSheet_().getParent().getUrl();
  Logger.log('申请 DB 表格: ' + url);
  if(EBOOK_URL){
    var code = UrlFetchApp.fetch(EBOOK_URL, {muteHttpExceptions:true}).getResponseCode();
    Logger.log('秘籍 URL 响应码: ' + code + (code===200 ? ' (正常)' : ' (PDF 可能还没上线,请检查 URL)'));
  }
  return url;
}

function testSendToSelf(){
  var ok = sendEbook_({ '姓名':'测试', '邮箱': NOTIFY_EMAIL });
  Logger.log('测试发送结果: ' + ok);
}

/* ---- 给申请人发送中文秘籍 PDF ---- */
function sendEbook_(p){
  try{
    var to = String(p['邮箱'] || '').trim();
    if(!to || to.indexOf('@') < 0) return 'no-email';

    var blob;
    if(EBOOK_URL){
      blob = UrlFetchApp.fetch(EBOOK_URL).getBlob().setName(EBOOK_FILENAME);
    }else if(EBOOK_FILE_ID){
      blob = DriveApp.getFileById(EBOOK_FILE_ID).getBlob().setName(EBOOK_FILENAME);
    }else{
      return 'no-file-source';
    }
    var name = String(p['姓名'] || '').trim() || '老板';

    var html =
      '<div style="font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;max-width:560px;margin:0 auto;color:#241c2e;line-height:1.75">' +
        '<div style="background:linear-gradient(135deg,#a23ad1,#681d80);padding:26px 24px;border-radius:14px 14px 0 0;color:#fff">' +
          '<div style="font-size:12px;letter-spacing:3px;color:#ffe27a;font-weight:700">TREVITY · V-MARKETING</div>' +
          '<div style="font-size:21px;font-weight:800;margin-top:8px">越南 KOC 营销秘籍</div>' +
        '</div>' +
        '<div style="border:1px solid #e7ddef;border-top:0;border-radius:0 0 14px 14px;padding:26px 24px">' +
          '<p>' + escapeHtml_(name) + ' 老板,您好,这里是 TREVITY。</p>' +
          '<p>感谢您的申请。您所申请的 <b>《越南 KOC 营销秘籍》</b> 已作为 <b>PDF 附件</b> 一并发送给您。</p>' +
          '<p style="background:#f5ecfb;border-left:4px solid #a23ad1;padding:12px 16px;border-radius:6px;margin:18px 0">' +
            'TikTok·KOC 为什么在越南这么强、该找什么样的 KOC、如何邀约 ' +
            '— 我们把落地就能用的实战干货浓缩成了一册。</p>' +
          '<p>看完之后,如果您想知道 <b>"我的门店该怎么用?"</b>,' +
            '直接回复本邮件即可,我们将为您 <b>免费诊断 KOC 策略</b>。</p>' +
          '<p style="margin-top:22px;color:#7b7385;font-size:13px">TREVITY VIETNAM · 胡志明 · 大邱 · 首尔<br>' +
            '<a href="' + LANDING_URL + '" style="color:#a23ad1">' + LANDING_URL + '</a></p>' +
        '</div>' +
      '</div>';

    var plain =
      name + ' 老板,您好,这里是 TREVITY。\n\n' +
      '感谢您的申请。您所申请的《越南 KOC 营销秘籍》已作为 PDF 附件发送给您。\n\n' +
      '看完后如果想了解如何用在自己门店,直接回复本邮件即可 — 我们将免费为您诊断 KOC 策略。\n\n' +
      'TREVITY · 胡志明·大邱·首尔\n' + LANDING_URL;

    var opts = {
      htmlBody: html,
      name: SENDER_NAME,
      replyTo: REPLY_TO || NOTIFY_EMAIL,
      attachments: [blob]
    };
    if(FROM_ALIAS) opts.from = FROM_ALIAS;
    GmailApp.sendEmail(to, '[TREVITY] 您申请的越南 KOC 营销秘籍', plain, opts);
    return true;
  }catch(err){
    return String(err);
  }
}

/* ---- 内部 ---- */
function getSheet_(){
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss;
  if(id){
    ss = SpreadsheetApp.openById(id);
  }else{
    ss = SpreadsheetApp.create('TREVITY KOC 秘籍申请 DB (中文)');
    props.setProperty('SHEET_ID', ss.getId());
  }
  var sh = ss.getSheetByName(SHEET_NAME);
  if(!sh){
    sh = ss.getSheets()[0];
    sh.setName(SHEET_NAME);
  }
  if(sh.getLastRow() === 0){
    sh.appendRow(HEADERS);
    sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#f7f0fc');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1,150); sh.setColumnWidth(7,300);
  }
  return sh;
}

function notify_(p, now, sentMark){
  try{
    var body =
      '收到一条新的秘籍申请(中文)。\n\n' +
      '申请时间 : ' + now + '\n' +
      '姓名     : ' + (p['姓名']||'') + '\n' +
      '店名     : ' + (p['店名']||'') + '\n' +
      '行业     : ' + (p['行业']||'') + '\n' +
      '电话     : ' + (p['电话']||'') + '\n' +
      '邮箱     : ' + (p['邮箱']||'') + '\n' +
      '备注     : ' + (p['备注']||'') + '\n\n' +
      '秘籍自动发送 : ' + sentMark + '\n';
    MailApp.sendEmail(NOTIFY_EMAIL, '[TREVITY-CN] KOC秘籍申请 — ' + (p['店名']||''), body);
  }catch(err){ /* 邮件失败不影响表格保存 */ }
}

function escapeHtml_(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function json_(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
