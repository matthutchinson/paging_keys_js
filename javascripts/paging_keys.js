/*  from http://la.ma.la/blog/diary_200511041713.htm - hotkey.js */

function HotKey(element){
	this.target = element || document;
	this._keyfunc = {};
	this.init();
}
HotKey.kc2char = function(kc){
	var between = function(a,b){
		return a <= kc && kc <= b
	}
	var _32_40 = "space pageup pagedown end home left up right down".split(" ");
	var kt = {
		8  : "back",
		9  : "tab"  ,
		13 : "enter",
		16 : "shift",
		17 : "ctrl",
		46 : "delete"
	};
	return (
		between(65,90)  ? String.fromCharCode(kc+32) : // a-z
		between(48,57)  ? String.fromCharCode(kc) :    // 0-9
		between(96,105) ? String.fromCharCode(kc-48) : // num 0-9
		between(32,40)  ? _32_40[kc-32] :
		kt.hasOwnProperty(kc) ? kt[kc] :
		null
	)
}
HotKey.prototype.ignore = /input|textarea/i;
HotKey.prototype.init = function(){
	var self = this;
	var listener = function(e){
		self.onkeydown(e)
	};
	if(this.target.addEventListener){
		this.target.addEventListener("keydown", listener, true);
	}else{
		this.target.attachEvent("onkeydown", listener)
	}
}
HotKey.prototype.onkeydown = function(e){
	var tag = (e.target || e.srcElement).tagName;
	if(this.ignore.test(tag)) return;
	var input = HotKey.kc2char(e.keyCode);

	if(e.shiftKey && input.length == 1){
		input = input.toUpperCase()
	}
	if(e.altKey) input = "A" + input;
	if(e.ctrlKey) input = "C" + input;

	if(this._keyfunc.hasOwnProperty(input)){
		this._keyfunc[input].call(this,e)
	}
}
HotKey.prototype.sendKey = function(key){
	this._keyfunc[key] && this._keyfunc[key]()
}
HotKey.prototype.add = function(key,func){
	if(key.constructor == Array){
		for(var i=0;i<key.length;i++)
			this._keyfunc[key[i]] = func;
	}else{
		this._keyfunc[key] = func;
	}
}
HotKey.prototype.remove = function(key){
	if(key.constructor == Array){
		for(var i=0;i<key.length;i++)
			this._keyfunc[key[i]] = function () {};
	}else{
		this._keyfunc[key] = function () {};
	}
}

/* paging_keys - item nav and paginate with keyboard navigation - inspired by ffffound.com UI */
/* amended handling of short items on page (scroll bottom hit before last item hit means advance to next page) - matthewhutchinson.net */
/* see below for html class name matching on items and prev/next nav links, and script uses (almost) standard jkhl keys */

var item_map = [];
var asset_loaded = false;
var hot_key = false;
var disable_hot_key = false;

function getWindowBounds() {
  var w, h, x, y;
  if (Prototype.Browser.Gecko) {
    var b = document.body;
    w = b.clientWidth;
    h = b.clientHeight;
    x = window.scrollX;
    y = window.scrollY;
  }
  else if (Prototype.Browser.WebKit) {
    w = window.innerWidth;
    h = window.innerHeight;
    x = window.scrollX;
    y = window.scrollY;
  }
  else if (Prototype.Browser.Opera) {
    w = window.innerWidth;
    h = window.innerHeight;
    x = window.pageXOffset;
    y = window.pageYOffset;
  }
  else {
    var d = document.documentElement;
    var b = document.body;
    w = d.clientWidth  ? d.clientWidth  : b.clientWidth  ? b.clientWidth  : 0;
    h = d.clientHeight ? d.clientHeight : b.clientHeight ? b.clientHeight : 0;
    x = d.scrollLeft   ? d.scrollLeft   : b.scrollLeft   ? b.scrollLeft   : 0;
    y = d.scrollTop    ? d.scrollTop    : b.scrollTop    ? b.scrollTop    : 0;
  }
  return {
    'w': w,
    'h': h,
    'x': x,
    'y': y
  };
}

function getScrollTop() {
  return window.pageYOffset
    || document.documentElement.scrollTop
    || document.body.scrollTop
    || 0;
}

/* fix for IE redirection */
function redirect(href) {
  if (Prototype.Browser.IE) {
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = href;
    document.body.appendChild(a);
    a.click();
  }
  else {
    location.href = href;
  }
}

try {
  hot_key = new HotKey();
  hot_key.add('r', function() { location.reload(); });
  hot_key.add('e', function() { location.href = '/'; });
}
catch (e) { }

if (hot_key) {
  hot_key.add('j', function() { move_item(1); });
  hot_key.add('k', function() { move_item(-1); });
  hot_key.add('h', function() { move_page(-1); });
  hot_key.add('l', function() { move_page(1); });
}

function disable_hotkeys() {
  if (hot_key) {
    disable_hot_key = true;
    hot_key.remove('j');
    hot_key.remove('k');
    hot_key.remove('h');
    hot_key.remove('l');
  }
}

function add_to_item_map(n) {
  var pos = Position.cumulativeOffset(n);
  item_map.push({id: n.id, y: pos[1] - 20});
}

function build_item_map() {
  asset_loaded = false;
  item_map.clear();

  if ($$('.prev_page')[0]) {
	  if($$('.prev_page')[0].href)
     item_map.push({id: 'prev', y: 0});
  }
  else {
    item_map.push({id: null, y: 0});
  }

  var nodes = $$('.hentry h2 a.entry-title');
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.id.match(/^post/i)) {
      add_to_item_map(n);
    }
  }

  item_map.sort(function(a, b) {
    return a.y - b.y;
  });

  var last = item_map.length - 1;

	if($$('.next_page')[0]) {
  	if($$('.next_page')[0].href)
    	item_map.push({id: 'next', y: document.body.scrollHeight});
  }

  asset_loaded = true;
}

function move_item(delta, p) {
  if (!asset_loaded) {
    return false;
  }

  if (p == null) {
    p = get_current_item(delta);
  }

  var old_y = getScrollTop();

  if (p) {
    if (p.id == 'prev' || p.id == 'next') {
      if (p.id == 'next') {
        move_page_next();
      }
      else {
        move_page_prev();
      }
      return false;
    }

    var e = $('post-' + p.id) || $(p.id);
    var x = 0, y = 0;
    if (e) {
      e.focus();
      y = p.y;
    }
    else { y = p.y; }

    window.scrollTo(x, y);
    
    if((delta > 0) && (old_y == getScrollTop())) {
      move_page(1);
    }
  }
  return true;
}

function get_current_item(delta, y) {
  if (y == null) {
    y = getScrollTop();
  }

  var p = item_map.length - 1;

  for (var i = 0; i < item_map.length; i++) {
    if (y < item_map[i].y) {
      p = i - 1;
      break;
    }
  }

  if ((delta < 0 && item_map[p] && item_map[p].y == y) || 0 < delta) {
    p += delta;
  }
  else if (getWindowBounds().h + getScrollTop() == document.body.scrollHeight && 0 < delta) {
    p++;
  }

  p = Math.max(p, 0);
  return item_map[p];
}

function where_am_i() {
  var st = document.body.scrollTop;
  var sl = document.body.scrollLeft;
  var sh = document.body.scrollHeight;
  var ch = 0;

  if (Prototype.Browser.WebKit) {
    ch = window.innerHeight;
  }
  else {
    ch = document.body.clientHeight;
  }

  return {
    'top': st,
    'left': sl,
    'height': sh,
    'clientHeight': ch,
    'is_at_top': st == 0 && sl == 0,
    'is_at_last': st + ch == sh && sl == 0
  }
}

function move_page(delta) {
  var p = where_am_i();

  if (delta < 0) {
    if (p.is_at_top) {
      move_page_prev();
    }
    else {
      window.scroll(0, 0);
    }
  }
  else {
    if (p.is_at_last) {
      move_page_next();
    }
    else {
      window.scroll(0, p.height);
    }
  }
}

function move_page_next() {
	if ($$('.next_page')[0]) {
  	if ($$('.next_page')[0].href != null) {
    	redirect($$('.next_page')[0].href);
    	disable_hotkeys();
    	return true;
		}
  }
  else { return false; }
}

function move_page_prev() {
  if ($$('.prev_page')[0].href != null) {
    redirect($$('.prev_page')[0].href+'#bottom');
    disable_hotkeys();
    return true;
  }
  else { return false; }
}

function initAssetsPage() {
    if (Prototype.Browser.MobileSafari) { return; }
    $(document).observe('dom:loaded', function() { build_item_map(); });
}

initAssetsPage();