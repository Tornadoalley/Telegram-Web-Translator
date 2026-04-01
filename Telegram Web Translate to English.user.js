// ==UserScript==
// @name         Telegram Web Translate to English
// @namespace    https://github.com/
// @version      4.4
// @description  Lightweight translator script for Telegram Web. Translates messages to English with toggle button.
// @author       Tornadoalley
// @match        https://web.telegram.org/*
// @grant        none
// @run-at       document-start
// @license      GNU GPLv3
// ==/UserScript==
 
// Description: Lightweight translator script for Telegram Web, translates all messages to English while showing the original message above.
// How to use: Can be enabled/disabled with a button at the top of the toolbar. Automatically translates any messages not in English
// Copyright: Free for anyone to use, modify, or publish.
 
(function () {
    'use strict';
 
    var isEnabled = true;
    var TARGET_LANG = 'en';
    var lastRequest = 0;
    var MIN_DELAY = 300;
    var toggleButton = null;
 
    // ==================== Translation Function ====================
    function translateText(text) {
        return new Promise(function (resolve) {
            if (!text || text.trim().length < 2) {
                resolve(null);
                return;
            }
 
            var now = Date.now();
            if (now - lastRequest < MIN_DELAY) {
                setTimeout(function () {
                    translateText(text).then(resolve);
                }, MIN_DELAY);
                return;
            }
            lastRequest = now;
 
            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + TARGET_LANG + '&dt=t&q=' + encodeURIComponent(text);
 
            fetch(url)
                .then(function (res) {
                    return res.ok ? res.json() : null;
                })
                .then(function (data) {
                    if (data && data[0]) {
                        var translated = '';
                        for (var i = 0; i < data[0].length; i++) {
                            if (data[0][i] && data[0][i][0]) {
                                translated += data[0][i][0];
                            }
                        }
                        resolve(translated.trim());
                    } else {
                        resolve(null);
                    }
                })
                .catch(function () {
                    console.warn('[TG Translate] Translation failed');
                    resolve(null);
                });
        });
    }
 
    function isAlreadyTranslated(el) {
        return el && el.querySelector && el.querySelector('.tg-translated') !== null;
    }
 
    function cleanMessageText(textEl) {
        if (!textEl) return '';
        var clone = textEl.cloneNode(true);
        var metas = clone.querySelectorAll ? clone.querySelectorAll('.MessageMeta, .message-time, .message-replies-wrapper, .was-edited') : [];
        for (var i = 0; i < metas.length; i++) {
            if (metas[i] && metas[i].parentNode) {
                metas[i].parentNode.removeChild(metas[i]);
            }
        }
        var text = (clone.textContent || '').trim();
        text = text.replace(/\s*(?:\d{1,2}:\d{2}\s*[AP]M|edited\s*\d{1,2}:\d{2}\s*[AP]M|\d+ replies?)\s*$/i, '').trim();
        return text;
    }
 
    function addTranslation(messageEl, translated) {
        if (isAlreadyTranslated(messageEl)) return;
 
        var transDiv = document.createElement('div');
        transDiv.className = 'tg-translated';
        transDiv.style.cssText = 'margin-top:6px;padding:6px 10px;border-left:4px solid #34d399;color:#34d399;font-size:0.93em;line-height:1.35;background:rgba(52,211,153,0.08);border-radius:4px;word-break:break-word;';
        transDiv.textContent = translated;
 
        var container = messageEl;
        if (messageEl.querySelector) {
            container = messageEl.querySelector('.text-content') || messageEl.querySelector('.content-inner') || messageEl;
        }
        container.appendChild(transDiv);
    }
 
    function processMessage(messageEl) {
        if (!isEnabled || isAlreadyTranslated(messageEl)) return;
 
        var textEl = null;
        if (messageEl.querySelector) {
            textEl = messageEl.querySelector('.text-content');
        }
        if (!textEl) return;
 
        var cleanText = cleanMessageText(textEl);
        if (cleanText.length < 3) return;
 
        translateText(cleanText).then(function (translated) {
            if (translated && translated !== cleanText) {
                addTranslation(messageEl, translated);
            }
        });
    }
 
    // ==================== Toggle Button ====================
    function createToggleButton() {
        if (toggleButton && document.getElementById('tg-translate-toggle')) return;
 
        toggleButton = document.createElement('button');
        toggleButton.id = 'tg-translate-toggle';
        toggleButton.style.cssText = 'margin:0 8px 0 4px;padding:0 14px;height:34px;border:none;border-radius:8px;font-weight:600;font-size:13.5px;cursor:pointer;display:flex;align-items:center;gap:6px;background:' + (isEnabled ? '#2a9d8f' : '#475569') + ';color:#ffffff;transition:all 0.2s ease;box-shadow:0 1px 3px rgba(0,0,0,0.2);';
 
        var updateButton = function () {
            toggleButton.innerHTML = isEnabled
                ? '<span>🌐</span> EN'
                : '<span style="color:#cbd5e1;">🌐</span> OFF';
            toggleButton.style.background = isEnabled ? '#2a9d8f' : '#475569';
        };
        updateButton();
 
        toggleButton.addEventListener('mouseenter', function () {
            toggleButton.style.transform = 'translateY(-1px)';
            toggleButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        toggleButton.addEventListener('mouseleave', function () {
            toggleButton.style.transform = 'translateY(0)';
            toggleButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        });
 
        toggleButton.addEventListener('click', function () {
            isEnabled = !isEnabled;
            updateButton();
 
            if (isEnabled) {
                var messages = document.querySelectorAll ? document.querySelectorAll('.Message') : [];
                for (var i = 0; i < messages.length; i++) {
                    processMessage(messages[i]);
                }
            } else {
                var translateds = document.querySelectorAll ? document.querySelectorAll('.tg-translated') : [];
                for (var j = 0; j < translateds.length; j++) {
                    if (translateds[j] && translateds[j].parentNode) {
                        translateds[j].parentNode.removeChild(translateds[j]);
                    }
                }
            }
        });
 
        var tryInsert = function () {
            var pinned = document.querySelector ? document.querySelector('.HeaderPinnedMessageWrapper') : null;
            if (pinned && pinned.parentNode) {
                pinned.parentNode.insertBefore(toggleButton, pinned);
                return true;
            }
            var tools = document.querySelector ? document.querySelector('.header-tools') : null;
            if (tools) {
                tools.insertBefore(toggleButton, tools.firstChild);
                return true;
            }
            return false;
        };
 
        if (!tryInsert()) {
            setTimeout(function () {
                if (!tryInsert()) setTimeout(tryInsert, 800);
            }, 800);
        }
    }
 
    // ==================== Observer ====================
    function startObserver() {
        var observer = new MutationObserver(function (mutations) {
            if (!isEnabled) return;
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var node = mutation.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    if (node.classList && node.classList.contains('Message')) {
                        processMessage(node);
                    }
                    if (node.querySelectorAll) {
                        var msgs = node.querySelectorAll('.Message');
                        for (var k = 0; k < msgs.length; k++) {
                            processMessage(msgs[k]);
                        }
                    }
                }
            }
        });
 
        var roots = [];
        if (document.querySelector) {
            roots.push(document.querySelector('.messages-container'));
            roots.push(document.querySelector('.MessageList'));
        }
        roots.push(document.body);
 
        for (var i = 0; i < roots.length; i++) {
            if (roots[i]) {
                observer.observe(roots[i], { childList: true, subtree: true });
            }
        }
    }
 
    function init() {
        createToggleButton();
        setTimeout(function () {
            if (isEnabled && document.querySelectorAll) {
                var messages = document.querySelectorAll('.Message');
                for (var i = 0; i < messages.length; i++) {
                    processMessage(messages[i]);
                }
            }
        }, 1500);
        startObserver();
    }
 
    // Handle chat switching
    var lastUrl = location.href;
    new MutationObserver(function () {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(function () {
                createToggleButton();
                if (isEnabled && document.querySelectorAll) {
                    var messages = document.querySelectorAll('.Message');
                    for (var i = 0; i < messages.length; i++) {
                        processMessage(messages[i]);
                    }
                }
            }, 800);
        }
    }).observe(document.documentElement, { childList: true, subtree: true });
 
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
