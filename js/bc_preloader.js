/*
 * bc_preloader JavaScript Library v0.9.5
 * Author Atsushi Kitamura 
 * Since 2011-10-08
 */
 
/*-------------------------------------------------

画像のプリローダー

---------------------------------------------------
◆使用例：ひとつのプリローダーを実行する場合
var urls = ['aaaa.jpg', 'bbbb.jpg'];
var onComplete = function(){
	alert('ロード完了！');
};
var ldr = new BC_Preloader(urls, false, onComplete);
ldr.start();

◆使用例：複数のプリローダーを順次実行する場合
var urls1 = ['aaaa.jpg', 'bbbb.jpg'];
var onComplete1 = function(){
	alert('ロード１完了！');
};
var urls2 = ['ccc.jpg', 'ddd.jpg'];
var onComplete2 = function(){
	alert('ロード２完了！');
};
var ldr1 = new BC_Preloader(urls1, false, onComplete1);
var ldr2 = new BC_Preloader(urls2, false, onComplete2);
ldr1.add(ldr2);
ldr1.start();

◆使用例：複数のプリローダーを登録するが、あるプリローダーが終了すると、以降のプリローダーの実行を中止し、任意のタイミングで再開する場合
var urls1 = ['aaaa.jpg', 'bbbb.jpg'];
var onComplete1 = function(){
	// ldr1終了後、1000ミリ秒後（※任意のタイミング）にldr2を再開
	setTimeout(function(){
		ldr2.start();
	}, 1000);
};
var urls2 = ['ccc.jpg', 'ddd.jpg'];
var ldr1 = new BC_Preloader(urls1, true, onComplete1); ※第二引数をtrueにすると、そのプリローダーが終了すると、以降のプリローダー（ここではldr2）は実行されない。
var ldr2 = new BC_Preloader(urls2);
ldr1.start();

◆使用例：画像ダウンロード後、getImg(path)で画像オブジェクトをで取得する場合
var ldr = new BC_Preloader();
var url = '/fashion/lp/img/photo.jpg';
ldr.urls = [url];
ldr.onComplete = function(){
	var photoImg = ldr.getImg(url);
	$(photoImg).appendTo('body');
ldr.start();
-------------------------------------------------*/


function BC_Preloader(urls_array, stopOnComplete_bool, onComplete_func, onAllComplete_func) {
	var self = this;
	this.parent = null;
	this.myId = 'id' + new Date().getTime();
	this.isIE = false;
	if (navigator.userAgent.indexOf('MSIE') != -1) {
		this.isIE = true;
	}
	this.stopOnComplete = false;
	this.currentLoader = this;
	this.className = 'BC_Preloader';
	this.imgCnt = -1;
	this.imgs = [];
	this.urls = [];
	this.indexes = {};
	this.total = 0;
	this.loaded = 0;
	this.error = 0;
	this.retryMaxCnt = 3;
	this.checkInterval = 200;
	this.childSum = 0;
	this.childIndex = -1;
	
	if (typeof stopOnComplete_bool == 'boolean') {
		this.stopOnComplete = stopOnComplete_bool;
	}
	
	if (urls_array && (urls_array.length > 0)) {
		this.urls = urls_array;
		this.total = this.urls.length;
	}
	this.onComplete = null;
	
	if (typeof(onComplete_func) == 'function') {
		this.onComplete = onComplete_func;
	}
	this.onAllComplete = null;
	
	if (typeof(onAllComplete_func) == 'function') {
		this.onAllComplete = onAllComplete_func;
	}
	this.isComplete = false;
	this.isAllComplete = false; 
	this.isDirectStart = false;
	this.timer_loading;
	this.timer_connection;
	this.connectionMaxCnt = 3;
	this.connectionCnt = 0;
	this.otherPreloaders = [];
	
  // ロードを開始
	this.start = function(){
		self.total = self.urls.length;
		if (self.urls.length > 0) {
			self.timer_connection = setInterval(checkConnection, 10);
			
			self.timer_loading = setInterval(function(){
				if (self.total <= (self.loaded + self.error)) {
					clearInterval(self.timer_loading);
					self.isComplete = true;
					if (typeof self.onComplete == 'function') {
						self.onComplete();
						self.onComplete = null;
					}
					if (!self.stopOnComplete) {
						checkOtherPreloader();
					}
				}
			}, self.checkInterval);
		}
		else {
			self.urls.length = 0;
			self.isComplete = true;
			if (typeof self.onComplete == 'function') {
				self.onComplete();
				self.onComplete = null;
			}
			if (typeof self.onAllComplete == 'function') {
				self.onAllComplete();
				self.onAllComplete = null;
			}
		}
	};
	
	this.lockOffAllStopOnComplete = function () {
		// 親ローダーのstopOnCompleteを解除
		if (self.parent) {
			self.parent.stopOnComplete = false;
		}
		else {
			self.stopOnComplete = false;
		}
		// 子ローダーのstopOnCompleteを解除
		if (self.parent) {
			for (var i=0; i<self.parent.otherPreloaders.length; i++) {
				self.parent.otherPreloaders[i].stopOnComplete = false;
			}
		}
		else {
			for (var i=0; i<self.otherPreloaders.length; i++) {
				self.otherPreloaders[i].stopOnComplete = false;
			}
		}
	};

	this.checkOtherPreloader = function(){
		var cnt = 0;
		
		// 親ローダーが完了していない場合は親ローダーの画像をロード
		if ((!self.isComplete) && (self != self.currentLoader)) {
			cnt ++;
			self.currentLoader = ldr;
			self.start();
			return false;
		}
		
		// 子ローダーで完了していない場合はそのローダーの画像をロード
		for (var i=0; i<self.otherPreloaders.length; i++) {
			var ldr = self.otherPreloaders[i];
			
			if ((!ldr.isComplete) && (ldr != self.currentLoader)) {
				cnt ++;
				self.currentLoader = ldr;
				ldr.start();
				return false;
			}
		}

		if (cnt === 0) {
			if (self.isDirectStart) {
				self.isDirectStart = false;
				self.start();
			}
			else {
				self.isAllComplete = true;
				
				if (typeof self.onAllComplete == 'function') {
					self.onAllComplete();
					self.onAllComplete = null;
				}
				
				for (var k=0; k<self.otherPreloaders.length; k++) {
					var ldr = self.otherPreloaders[k];
					if (typeof ldr.onAllComplete == 'function') {
						ldr.onAllComplete();
						ldr.onAllComplete = null;
					}
				}
			}
		}
	};
	
	this.directCheckOtherPreloader = checkOtherPreloader;
	
  // 他にローダーがあるかどうかチェック
	function checkOtherPreloader() {
		if (self.parent) {
			self.parent.checkOtherPreloader();
		}
		else {
			self.checkOtherPreloader();
		}
	}
	
  // ローディングを中断（※サーバーへリクエスト済みの画像以降のリクエストを中断する。）
	this.stop = function(){
		clearInterval(self.timer_loading);
		clearInterval(self.timer_connection);
	};
	
  // 同時接続数を管理
	function checkConnection() {
		if (self.connectionCnt < self.connectionMaxCnt) {
			if (self.total <= (self.loaded + self.error)) {
				clearInterval(self.timer_connection);
			}
			else {
				self.loadImg();
			}
		}
	}

  // リクエスト＆ロード処理
	this.loadImg = function(reusedImg) {
		var cacheImg;
		
		if (!reusedImg) {
			if (self.imgCnt < (self.urls.length - 1)) {
				self.imgCnt ++;
				self.imgs[self.imgCnt] = null;
				cacheImg = document.createElement('img');
				self.connectionCnt ++;
				cacheImg.src = self.urls[self.imgCnt];
				cacheImg.myIndex = self.imgCnt;
				cacheImg.retryCnt = 0;
				self.indexes[self.urls[self.imgCnt]] = self.imgCnt;
				
        // ロード完了時の処理（※IEの場合）
				if (self.isIE && (cacheImg.width != 0)) {
					self.loaded ++;
					self.connectionCnt --;
					self.imgs[cacheImg.myIndex] = cacheImg;
					cacheImg.isComplete = true;
				}
        // ロード完了時の処理（※IE以外の場合）
				else {
					cacheImg.onload = function(){
						self.loaded ++;
						self.connectionCnt --;
						self.imgs[cacheImg.myIndex] = this;
						cacheImg.isComplete = true;
					};
				}
				
        // ロード失敗時の処理
				cacheImg.onerror = function(){
					this.retryCnt ++;
					if (this.retryCnt > self.retryMaxCnt) {
						self.error ++;
						self.connectionCnt --;
						this.isComplete = false;
					}
					else {
						self.loadImg(this);
					}
				};
			}
		}
		
		else {
			cacheImg = reusedImg;
			cacheImg.src = self.urls[cacheImg.myIndex];
		}
	};
	
  // 自分のクラス名を返す
	this.getName = function(){
		return self.className;
	};
	
  // ロードした画像のImageオブジェクトを取得
	this.getImg = function(src_str){
		if (typeof src_str == 'string') {
			return self.imgs[self.indexes[src_str]];
		}
		else {
			return false;
		}
	};
	
  // 他のPreloaderを追加（※このメソッドは親ローダーに実行させる。）
	this.add = function(preloader_ins){
		preloader_ins.parent = self;
		self.otherPreloaders.push(preloader_ins);
		preloader_ins.childIndex = self.childSum;
		self.childSum ++;
	};
	
  // 追加された、任意のPreloaderのローディング処理を実行（※このメソッドは親ローダーに実行させる。）
	this.directStart = function(index){
		if (!self.parent) {
			self.currentLoader.stop();
			
			if ((index >= 0) && (index < self.otherPreloaders.length)) {
				self.currentLoader = self.otherPreloaders[index];
				self.isDirectStart = true;
				self.currentLoader.start();
			}	
		}
		else {
			console.log('子ローダーがないのでdirectStartできません。');
		}
	};
}
