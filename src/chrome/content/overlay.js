/* ***** BEGIN LICENSE BLOCK Version: GPL 3.0 ***** 
 * FireMobileFimulator is a Firefox add-on that simulate web browsers of 
 * japanese mobile phones.
 * Copyright (C) 2008  Takahiro Horikawa <horikawa.takahiro@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * ***** END LICENSE BLOCK ***** */

var msim = {
	onInitialize : function() {
		// initialization code
		dump("[msim]onInitialize\n");

		this.strings = document.getElementById("msim-strings");
		// initialize UserAgent
		var windowContent = window.getBrowser();
		if (windowContent) {
			dump("set load2\n");
			try {

				window.removeEventListener('load', msim_onInitialize, false);
			} catch (exception) {
				dump("[msim]removeEventListner error:" + exception + "\n");
			}
			windowContent.addEventListener('load', msim.msim_BrowserOnLoad,
					true);
		}

		var initialized = pref.getBoolPref("msim.config.initialized");
		if (!initialized) {
			// 何か初期化処理をしたい場合はここに記載
			// pref.setBoolPref("msim.config.initialized", true);
		}
		this.updateIcon();
	},

	onUnload : function() {
		dump("[msim]onUnload\n");
		var windowCount = 0;
		var windowEnumeration = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				.getService(Components.interfaces.nsIWindowMediator)
				.getEnumerator("navigator:browser");

		try {
			window.removeEventListener("load", msim_onInitialize, false);
		} catch (exception) {
			dump("[msim]removeEventListner error:" + exception + "\n");
		}

		while (windowEnumeration.hasMoreElements()) {
			windowEnumeration.getNext();
			windowCount++;
		}

		dump("windowcount:" + windowCount.toString() + "\n");
		if (windowCount == 0) {
			this.msim_resetDevice();
		}

		try {
			window.removeEventListener("close", msim_onUnload, false);
		} catch (exception) {
			dump("[msim]removeEventListner error:" + exception + "\n");
		}

	},
	/*
	 * onLoad : function(event) { dump("[msim]onLoad\n"); var contentDocument =
	 * getPageLoadEventContentDocument(event); // If the content document is set
	 * if (contentDocument) { dump("update_icon();\n"); this.updateIcon(); } },
	 */
	displayDeviceSwitcherMenu : function(menu, suffix) {
		var optionsSeparator = document.getElementById("msim-separator2-"
				+ suffix);

		this.removeGeneratedMenuItems(menu, ["msim-default-" + suffix,
						"msim-options-" + suffix, "msim-about-" + suffix]);

		carrierArray.forEach(function(carrier) {
			var deviceCount = pref.getIntPref("msim.devicelist." + carrier
					+ ".count");
			for (var i = 1; i <= deviceCount; i++) {
				var menuItem = document.createElement("menuitem");

				var device = pref.copyUnicharPref("msim.devicelist." + carrier
						+ "." + i + ".device");
				var useragent = pref.copyUnicharPref("msim.devicelist."
						+ carrier + "." + i + ".useragent");

				if (device) {
					menuItem.setAttribute("id", "msim-device-" + suffix + "-"
									+ carrier + "-" + i);
					menuItem.setAttribute("label", carrier + " " + device);
					menuItem.setAttribute("oncommand", "setDevice(\"" + carrier
									+ "\", " + i + ");");
					menuItem.setAttribute("type", "radio");
					menuItem.setAttribute("name", "devicelist");
					menu.insertBefore(menuItem, optionsSeparator);
				}
			}
		});

		var currentMenuId = "msim-device-" + suffix + "-"
				+ pref.copyUnicharPref("msim.current.carrier") + "-"
				+ pref.copyUnicharPref("msim.current.id");
		var currentMenu = document.getElementById(currentMenuId);
		if (!currentMenu) {
			currentMenu = document.getElementById("msim-default-" + suffix);
		}
		currentMenu.setAttribute("checked", true);
	},

	removeGeneratedMenuItems : function(menu, permanentMenus) {
		var menuItem = null;

		// radioMenuItems = menu.getElementsByAttribute("type", "radio");
		var menuItems = menu.getElementsByTagName("menuitem");

		while (menuItems.length > permanentMenus.length) {
			menuItem = menuItems[1];

			if (!menuItem.hasAttribute("id")) {
				menu.removeChild(menuItem);
			} else {
				var deleteFlag = true;
				for (var i = 0; i < permanentMenus.length; i++) {
					if (menuItem.hasAttribute("id") == permanentMenus[i]) {
						deleteFlag = false
					}
				}
				deleteFlag && menu.removeChild(menuItem);
			}
		}

	},

	msim_resetDevice : function(e) {
		dump("[msim]resetDevice.\n");
		pref.deletePref("msim.current.carrier");
		pref.deletePref("msim.current.device");
		pref.deletePref("general.useragent.override");
		pref.deletePref("msim.current.useragent");
		pref.deletePref("msim.current.id");

		this.updateIcon();
	},

	msim_openOptions : function() {
		window.openDialog("chrome://msim/content/options/options.xul",
				"msim-options-dialog", "centerscreen,chrome,modal,resizable");
	},

	msim_openAbout : function() {
		window.openDialog("chrome://msim/content/about.xul",
				"msim-about-dialog", "centerscreen,chrome,modal,resizable");
	},

	msim_BrowserOnLoad : function(objEvent) {

		var carrier = pref.copyUnicharPref("msim.current.carrier");

		if (carrier) {
			var ndDocument = objEvent.originalTarget;
			if (!ndDocument.body) {
				// dump("body is null\n");
				return;
			}

			// Firefoxの埋め込み表示Content-Typeは、自動的にDOMに変換されている為、除外する。
			if (ndDocument.contentType != "text/html") {
				dump("document is not html\n");
				return;
			}

			if (AU == carrier) {
				// HDML暫定対応
				var hdmls = ndDocument.getElementsByTagName("hdml");
				if (hdmls.length >= 1) {
					var nodisplays = hdmls[0].getElementsByTagName("nodisplay");
					for (var i = 0; i < nodisplays.length; i++) {
						var actions = nodisplays[i]
								.getElementsByTagName("action");
						for (var j = 0; j < actions.length; j++) {
							var task = actions[j].getAttribute("task");
							var dest = actions[j].getAttribute("dest");
							if (task.toUpperCase() == "GO" && dest) {
								dump("[msim]Debug : hdml go <" + dest + ">\n");
								ndDocument.location.href = dest;
								return;
							}
						}
					}
				}

				// WML暫定対応
				var oneventTags = ndDocument.getElementsByTagName("wml:onevent");
				for (var i=0; i<oneventTags.length; i++){
					dump("wml:onevent found:"+i+"\n");
					var onevent = oneventTags[i];
					var type = onevent.getAttribute("type");
					if (type == "onenterforward") {
						var goTags = onevent.getElementsByTagName("wml:go");
						for (var j=0; j<goTags.length; j++){
							dump("wml:go found:"+j+"\n");
							var go = goTags[j];
							var href = go.getAttribute("href");
							if (href) {
								dump("onenterforward go:"+href+"\n");
								ndDocument.location.href = href;
							}
						}
					}
				}
				var wmlAnchorTags = ndDocument.getElementsByTagName("wml:anchor");
				for (var i=0; i<wmlAnchorTags.length; i++){
					var anchor = wmlAnchorTags[i];
					var spawnTags = anchor.getElementsByTagName("wml:spawn");
					for (var j=0; j<spawnTags.length; j++){
						var spawn = spawnTags[j];
						var href = spawn.getAttribute("href");
						if (href) {
							dump("wml:anchor->wml:spawn found. set link:"+href+"\n");
							//spawn.addEventListener("click", function(){ndDocument.location.href=href;},
							//	false);
							spawn.innerHTML = '<a href="'+href+'">'+spawn.innerHTML+"</a>";
						}
					}
				}

				var pictogramConverterEnabled = pref.getBoolPref("msim.config."+carrier+".pictogram.enabled")
				if (pictogramConverterEnabled){
					dump("[msim]convert pictogram in overlay.js\n");
					var mpc = MobilePictogramConverter.factory(carrier);
					mpc.setImagePath("chrome://msim/content/emoji");
					var imgs = ndDocument.getElementsByTagName("img");
					for (var i = 0; i < imgs.length; i++) {
						var iconno = imgs[i].getAttribute("localsrc")
								|| imgs[i].getAttribute("icon");
						if (iconno && !isNaN(iconno)) {
							imgs[i].setAttribute("src", mpc.getImageSrc(parseInt(
											iconno, 10)));
						} else if (iconno) {
							iconno = mpc.getIconNumFromIconName("_"+iconno);
							if (iconno) {
								imgs[i].setAttribute("src", mpc.getImageSrc(iconno));
							}
						}

					}
				}
			}

			if (DOCOMO == carrier) {

				var setUtnFunction = function(e) {
					dump("[msim]click utn\n");
					if (true == confirm(msim.strings
							.getString("msim_utnConfirmation"))) {
						pref.setBoolPref("msim.temp.utnflag", true);
					}
					return true;
				};

				var setLcsFunction = function(e) {
					dump("[msim]click lcs\n");
					if (true == confirm(msim.strings
							.getString("msim_lcsConfirmation"))) {
						pref.setBoolPref("msim.temp.lcsflag", true);
						return true;
					} else {
						return false;
					}
				};

				pref.setBoolPref("msim.temp.utnflag", false);
				pref.setBoolPref("msim.temp.lcsflag", false);

				var anchorTags = ndDocument.getElementsByTagName('a');
				for (var i = 0; i < anchorTags.length; i++) {
					var anchorTag = anchorTags[i];
					var utn = anchorTag.getAttribute("utn");
					if (null != utn) {
						anchorTag.addEventListener("click", setUtnFunction,
								false);
					}

					var lcs = anchorTag.getAttribute("lcs");
					if (null != lcs) {
						dump("setlcs for a tag\n");
						anchorTag.addEventListener("click", setLcsFunction,
								false);
					}
				}

				// formのUTN送信
				// uid=NULLGWDOCOMOのPOST送信
				// オープンiエリアの場合のメソッドを強制的にGETに書き換え
				// ##本当はhttp-on-modify-requestで書き換えたい##
				var formTags = ndDocument.getElementsByTagName('form');
				for (var i = 0; i < formTags.length; i++) {
					var formTag = formTags[i];

					//UTNセット
					var utn = formTag.getAttribute("utn");
					if (null != utn) {
						formTag.addEventListener("submit", setUtnFunction,
								false);
					}

					var lcs = formTag.getAttribute("lcs");
					if (null != lcs) {
						dump("setlcs for form tag\n");
						formTag.addEventListener("submit", setLcsFunction,
								false);
					}

					//オープンiエリアの場合のメソッドを強制的にGETに書き換え
					var action = formTag.getAttribute("action");
					if (action && action == "http://w1m.docomo.ne.jp/cp/iarea") {
						formTag.setAttribute("method", "GET");
					}

					//uid=NULLGWDOCOMOのPOST送信
					var method = formTag.getAttribute("method");
					if (method && method.toUpperCase() == "POST") {
						var inputTags = formTag.getElementsByTagName('input');
						for (var j = 0; j < inputTags.length; j++) {
							var inputTag = inputTags[j];
							var key = inputTag.getAttribute("name");
							var value = inputTag.value;
							if (key && value && key.toUpperCase() == "UID"
									&& value.toUpperCase() == "NULLGWDOCOMO") {
								dump("replace uid\n");
								var uid = pref
										.copyUnicharPref("msim.config.DC.uid");
								inputTag.value = uid;
							}
						}
					}
				}
			}
		}
	},

	// 他のツールバーボタンが開いていても、FireMobileSimulatorのツールバーボタンを開く
	msim_openToolbarButton : function(currentToolbarButton) {
		if (currentToolbarButton && !currentToolbarButton.open) {
			var toolbarButton = null;
			var toolbarButtons = currentToolbarButton.parentNode
					.getElementsByTagName("toolbarbutton");
			var toolbarButtonsLength = toolbarButtons.length;

			for (var i = 0; i < toolbarButtonsLength; i++) {
				toolbarButton = toolbarButtons.item(i);

				if (toolbarButton && toolbarButton != currentToolbarButton
						&& toolbarButton.open) {
					toolbarButton.open = false;
					currentToolbarButton.open = true;

					break;
				}
			}
		}
	},

	updateIcon : function() {
		dump("[msim]updateicon\n");
		var msimButton = document.getElementById("msim-button");
		var menu       = document.getElementById("msim-menu");
		if (msimButton) {
			var carrier = pref.copyUnicharPref("msim.current.carrier");
			if (!carrier) {
				dump("[msim]set default\n");
				msimButton.removeAttribute("device");
			} else {
				dump("[msim]set something device\n");
				msimButton.setAttribute("device", "on");
			}
		}
		if (menu) {
			var carrier = pref.copyUnicharPref("msim.current.carrier");
			if (!carrier) {
				dump("[msim]set default\n");
				menu.removeAttribute("device");
			} else {
				dump("[msim]set something device\n");
				menu.setAttribute("device", "on");
			}
		}
	}
};
function msim_onInitialize(e) {
	msim.onInitialize(e);
}
function msim_onUnload(e) {
	msim.onUnload(e);
}
window.addEventListener("load", msim_onInitialize, false);
window.addEventListener("unload", msim_onUnload, false);

dump("[msim]overlay.js is loaded.\n");
