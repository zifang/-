/*
 * DialogX: 扩展自Dialog2(http://nikku.github.io/jquery-bootstrap-scripting/)，修改了表单异步提交的行为，重新封装了alert\confirm\prompt等helper方法
 * DialogX相对于Dialog2，已经改的面目全非了，不要轻易从Dialog2升级！！！
 * @author jiangshl
 * 
 * 以下是DialogX的版权信息
 * ==========================================================================================
 * Dialog2: Yet another dialog plugin for jQuery.
 * This time based on bootstrap styles with some nice ajax control features, 
 * zero dependencies to jQuery.UI and basic options to control it.
 * 
 * Licensed under the MIT license 
 * http://www.opensource.org/licenses/mit-license.php 
 * 
 * @version: 2.0.0 (22/03/2012)
 * 
 * @requires jQuery >= 1.4 
 * 
 * @requires jQuery.form plugin (http://jquery.malsup.com/form/) >= 2.8 for ajax form submit 
 * 
 * @requires bootstrap styles (twitter.github.com/bootstrap) in version 2.x to look nice
 * 
 * @author nico.rehwaldt
 */
(function ($) {

    /**
     * Dialog html markup
     */
    var __DIALOG_HTML = "<div class='modal' style=\"display: none;\">" +
        "<div class='modal-header loading'>" +
        "<a href='#' class='close'></a>" +
        "<span class='loader'></span><h3></h3>" +
        "</div>" +
        "<div class='modal-body'>" +
        "</div>" +
        "<div class='modal-footer'>" +
        "</div>" +
        "</div>";

    /**
     * Constructor of DialogX internal representation 
     */
    var DialogX = function (element, options) {
        this.__init(element, options);

        var dialog = this;
        var handle = this.__handle;

        this.__ajaxCompleteTrigger = $.proxy(function (response, statusText, xhr, form) {
            if (typeof response == 'object') {
                var options = form.data("options");
                if (options) {
                    if (options.closeDialog) {
                        dialog.close();
                    }
                    var successFn = eval(options.successFn);
                    if (successFn) {
                        successFn(response, statusText, xhr, form);
                    }
                }
                dialog.enableButtons();
            } else {
                this.trigger("dialogX.ajax-complete");
                this.trigger("dialogX.content-update");
            }
        }, handle);

        this.__ajaxStartTrigger = $.proxy(function (arr, form, options) {

            if (!form.valid()) {
                return false;
            }

            dialog.enableButtons();
            var options = form.data("options");
            if (options) {
                var beforeSubmitFn = eval(options.beforeSubmitFn);
                if (beforeSubmitFn) {
                    beforeSubmitFn(arr, form, options);
                }
            }
        }, handle);

        /* 
		 * Allows us to change the xhr based on our dialog, e.g. 
		 * attach url parameter or http header to identify it) 
		 */
        this.__ajaxBeforeSend = $.proxy(function (xhr, settings) {
            handle.trigger("dialogX.before-send", [xhr, settings]);

            if ($.isFunction($.fn.dialogX.defaults.beforeSend)) {
                $.fn.dialogX.defaults.beforeSend.call(this, xhr, settings);
            }
        }, handle);

        this.__removeDialog = $.proxy(this.__remove, this);

        handle.bind("dialogX.ajax-start", function () {
            dialog.options({ buttons: options.autoAddCancelButton ? localizedCancelButton() : {} });
        });

        handle.bind("dialogX.content-update", function () {
            dialog.__ajaxify();
            dialog.__updateMarkup();
            dialog.__focus();
        });

        handle.bind("dialogX.ajax-complete", function () {
            handle.parent().removeClass("loading");
        });

        // Apply options to make title and stuff shine
        this.options(options);

        // We will ajaxify its contents when its new
        // aka apply ajax styles in case this is a inpage dialog
        handle.trigger("dialogX.content-update");
    };

    /**
     * DialogX api; methods starting with underscore (__) are regarded internal
     * and should not be used in production environments
     */
    DialogX.prototype = {

        /**
         * Core function for creating new dialogs.
         * Transforms a jQuery selection into dialog content, following these rules:
         * 
         * // selector is a dialog? Does essentially nothing
         * $(".selector").dialogX();
         * 
         * // .selector known?
         * // creates a dialog wrapped around .selector
         * $(".selector").dialogX();
         * 
         * // creates a dialog wrapped around .selector with id foo
         * $(".selector").dialogX({id: "foo"});
         * 
         * // .unknown-selector not known? Creates a new dialog with id foo and no content
         * $(".unknown-selector").dialogX({id: "foo"});
         */
        __init: function (element, options) {
            var selection = $(element);
            var handle;

            if (!selection.is(".modal-body")) {
                var overlay = $('<div class="modal-backdrop"></div>').hide();
                var parentHtml = $(__DIALOG_HTML);

                if (options.modalClass) {
                    parentHtml.addClass(options.modalClass);
                    delete options.modalClass;
                }

                $(".modal-header a.close", parentHtml)
                    .text(unescape("%D7"))
                    .click(function (event) {
                        event.preventDefault();

                        $(this)
                            .parents(".modal")
                            .find(".modal-body")
                                .dialogX("close");
                    });

                $("body").append(overlay).append(parentHtml);

                handle = $(".modal-body", parentHtml);

                // Create dialog body from current jquery selection
                // If specified body is a div element and only one element is 
                // specified, make it the new modal dialog body
                // Allows us to do something like this 
                // $('<div id="foo"></div>').dialogX(); $("#foo").dialogX("open");
                if (selection.is("div") && selection.length == 1) {
                    handle.replaceWith(selection);
                    selection.addClass("modal-body").show();
                    handle = selection;
                }
                    // If not, append current selection to dialog body
                else {
                    handle.append(selection);
                }

                if (options.id) {
                    parentHtml.attr("id", options.id);
                }
            } else {
                handle = selection;
            }

            this.__handle = handle;
            this.__overlay = handle.parent().prev(".modal-backdrop");

            this.__addFocusCatchers(parentHtml);
        },

        __addFocusCatchers: function (parentHandle) {
            parentHandle.prepend(new FocusCatcher(this.__handle, true));
            parentHandle.append(new FocusCatcher(this.__handle, false));
        },

        /**
         * Parse dialog content for markup changes (new buttons or title)
         */
        __updateMarkup: function () {
            var dialog = this;
            var e = dialog.__handle;

            e.trigger("dialogX.before-update-markup");

            // New options for dialog
            var options = {};

            // Add buttons to dialog for all buttons found within 
            // a .form-actions area inside the dialog

            // Instead of hiding .form-actions we remove it from view to fix an issue with ENTER not submitting forms 
            // when the submit button is not displayed
            var actions = $(".form-actions", e).css({ position: "absolute", top: "-9999px", left: "-9999px", height: "1px" });

            var buttons = actions.find("input[type=submit], input[type=button], input[type=reset], button, .btn");

            if (buttons.length) {
                options.buttons = {};

                buttons.each(function () {
                    var button = $(this);
                    var name = button.is("input") ? button.val() || button.attr("type") : button.html();

                    options.buttons[name] = {
                        id: button.attr("id"),
                        primary: button.is("input[type=submit] .btn-primary"),
                        type: button.attr("class"),
                        click: function (event) {
                            event.stopPropagation(); // by fuzhepan

                            if (button.is("a")) { window.location = button[0].href }
                            // simulate click on the original button
                            // to not destroy any event handlers
                            if (button.is(".btn-primary") || button.is(".btn-info"))//fixed click cancel button to trigger the callback by zhaok
                            {
                                button.click();
                            }

                            if (button.is(".close-dialog")) {
                                event.preventDefault();
                                dialog.close();
                            }
                        }
                    };
                });
            }

            // set title if content contains a h1 element
            var titleElement = e.find("h1").hide();
            if (titleElement.length > 0) {
                options.title = titleElement.html();
            }

            // apply options on dialog
            dialog.options(options);

            e.trigger("dialogX.after-update-markup");
        },

        /**
         * Apply ajax specific dialog behavior to the dialogs contents
         */
        __ajaxify: function () {
            var dialog = this;
            var e = this.__handle;

            e.trigger("dialogX.before-ajaxify");

            e.find("a.ajax").click(function (event) {
                var url = $(this).attr("href");
                var dialogClass = $(this).data("dialogClass");
                if (dialogClass) {
                    e.parent().removeClass().addClass("modal").addClass(dialogClass);
                }
                var dialogId = $(this).data("dialogId");
                if (dialogId) {
                    e.parent().attr("id", dialogId);
                }
                if ($(this).attr("title")) {
                    e.siblings(".modal-header").children("h3").html($(this).attr("title"));
                }
                dialog.load(url);
                event.preventDefault();
            }).removeClass("ajax");

            // Make submitable for an ajax form 
            // if the jquery.form plugin is provided
            if ($.fn.ajaxForm) {
                var form = $("form[plugin*='ajaxForm']", e);
                var closeDialog = false;
                var options = form.data("options");
                if (options) {
                    if (options.closeDialog) {
                        closeDialog = options.closeDialog;
                    }
                }
                var ajaxFormOptions = {
                    target: closeDialog ? null : e,
                    success: dialog.__ajaxCompleteTrigger,
                    beforeSubmit: dialog.__ajaxStartTrigger,
                    beforeSend: dialog.__ajaxBeforeSend,
                    error: function (response, statusText, xhr, form) {
                        dialog.enableButtons();
                        var options = form.data("options");
                        if (options) {
                            var errorFn = eval(options.errorFn);
                            if (errorFn) {
                                errorFn(response.responseText, statusText, xhr, form);
                            }
                        }
                    }
                };

                form.ajaxForm(ajaxFormOptions);
            }

            e.trigger("dialogX.after-ajaxify");
        },

        /**
         * Removes the dialog instance and its 
         * overlay from the DOM
         */
        __remove: function () {
            this.__overlay.remove();
            this.__handle.removeData("dialogX").parent().remove();
        },

        /**
         * Focuses the dialog which will essentially focus the first
         * focusable element in it (e.g. a link or a button on the button bar).
         * 
         * @param backwards whether to focus backwards or not
         */
        __focus: function (backwards) {
            var dialog = this.__handle;

            // Focus first focusable element in dialog
            var focusable = dialog
                              .find("a, input:not([type=hidden]), .btn, select, textarea, button")
                              .not("[tabindex='0']")
                              .filter(function () {
                                  return $(this).parents(".form-actions").length == 0;
                              }).eq(0);

            // may be a button, too
            var focusableButtons = dialog
                                      .parent()
                                      .find(".modal-footer")
                                      .find("input[type=submit], input[type=button], .btn, button");

            var focusableElements = focusable.add(focusableButtons);
            var focusedElement = focusableElements[backwards ? "last" : "first"]();

            // Focus the element
            focusedElement.focus();

            dialog.trigger("dialogX.focussed", [focusedElement.get(0)]);
            return this;
        },

        /**
         * Focuses the dialog which will essentially focus the first
         * focusable element in it (e.g. a link or a button on the button bar).
         */
        focus: function () {
            return this.__focus();
        },

        /**
         * Close the dialog, removing its contents from the DOM if that is
         * configured.
         */
        close: function () {
            var dialog = this.__handle;
            var overlay = this.__overlay;

            overlay.hide();

            dialog
                .parent().hide().end()
                .trigger("dialogX.closed")
                .removeClass("opened");
        },

        /**
         * Open a dialog, if it is not opened already
         */
        open: function () {
            var dialog = this.__handle;

            if (!dialog.is(".opened")) {
                this.__overlay.show();

                dialog
                    .trigger("dialogX.before-open")
                    .addClass("opened")
                    .parent()
                        .show()
                        .end()
                    .trigger("dialogX.opened");

                this.__focus();
            }
        },

        /**
         * Add button with the given name and options to the dialog
         * 
         * @param name of the button
         * @param options either function or options object configuring 
         *        the behaviour and markup of the button
         */
        addButton: function (name, options) {
            var handle = this.__handle;

            var id = options.id;
            var callback = $.isFunction(options) ? options : options.click;
            var footer = handle.siblings(".modal-footer");
            var actions = $(".form-actions", handle);
            if (actions.is(':hidden')) {
                footer.hide();
            } else {
                footer.show();
            }
            var button;
            if (id) {
                button = $("<a href='#' class='btn'></a>");
            } else {
                button = $("<a href='#' class='btn'></a>");
            }
            button.html(name)
                  .click(function (event) {
                      callback.apply(handle, [event]);
                      event.preventDefault();
                  });

            // legacy
            if (options.primary) {
                button.addClass("btn-primary");
            }

            if (options.type) {
                button.addClass(options.type);
            }

            footer.append(button);
        },

        /**
         * Remove button with the given name
         * 
         * @param name of the button to be removed
         */
        removeButton: function (name) {
            var footer = this.__handle.siblings(".modal-footer");

            footer
                .find("a.btn")
                    .filter(function (i, e) { return $(e).text() == name; })
                        .remove();

            return this;
        },

        /**
         * disable button with the given name
         */
        disableButtons: function () {
            var footer = this.__handle.siblings(".modal-footer");

            footer.find("a.btn").addClass("disabled");

            return this;
        },

        /**
         * enable button with the given name
         */
        enableButtons: function () {
            var footer = this.__handle.siblings(".modal-footer");

            footer.find("a.btn").removeClass("disabled");

            return this;
        },

        /**
         * Load the given url as content of this dialog
         * 
         * @param url to be loaded via GET
         */
        load: function (url) {
            var handle = this.__handle;

            if (handle.is(":empty")) {
                var loadText = this.options().initialLoadText;
                handle.html($("<span></span>").text(loadText));
            }

            handle.trigger("dialogX.ajax-start");
            handle.parent().addClass("loading");
            dialogLoad.call(handle, url, this.__ajaxCompleteTrigger, this.__ajaxBeforeSend);

            return this;
        },

        /**
         * Apply the given options to the dialog
         * 
         * @param options to be applied
         */
        options: function (options) {
            var storedOptions = this.__handle.data("options");

            // Return stored options if getter was called
            if (!options) {
                return storedOptions;
            }

            var buttons = options.buttons;
            delete options.buttons;

            // Store options if none have been stored so far
            if (!storedOptions) {
                this.__handle.data("options", options);
            }

            var dialog = this;

            var handle = dialog.__handle;
            var overlay = dialog.__overlay;

            var parentHtml = handle.parent();

            if (options.title) {
                $(".modal-header h3", parentHtml).html(options.title);
            }

            if (buttons) {
                if (buttons.__mode != "append") {
                    $(".modal-footer", parentHtml).empty();
                }

                $.each(buttons, function (name, value) {
                    dialog.addButton(name, value);
                });
            }

            if (__boolean(options.closeOnOverlayClick)) {
                overlay.unbind("click");

                if (options.closeOnOverlayClick) {
                    overlay.click(function (event) {
                        if ($(event.target).is(".modal-backdrop")) {
                            dialog.close();
                        }
                    });
                }
            }

            if (__boolean(options.showCloseHandle)) {
                var closeHandleMode = options.showCloseHandle ? "show" : "hide";
                $(".modal-header .close", parentHtml)[closeHandleMode]();
            }

            if (__boolean(options.removeOnClose)) {
                handle.unbind("dialogX.closed", this.__removeDialog);

                if (options.removeOnClose) {
                    handle.bind("dialogX.closed", this.__removeDialog);
                }
            }

            if (options.autoOpen === true) {
                this.open();
            }

            if (options.content) {
                this.load(options.content);
            }

            delete options.buttons;

            options = $.extend(true, {}, storedOptions, options);
            this.__handle.data("options", options);

            return this;
        },

        /**
         * Returns the html handle of this dialog
         */
        handle: function () {
            return this.__handle;
        }
    };

    /**
     * Returns a simple DOM node which -- while being invisible to the user -- 
     * should focus the given argument when the focus is directed to itself. 
     */
    function FocusCatcher(dialog, reverse) {
        return $("<span />")
            .css({ "float": "right", "width": "0px" })
            .attr("tabindex", 0)
            .focus(function (event) {
                $(dialog).dialogX("__focus", reverse);
                event.preventDefault();
            });
    };

    /**
     * Plugging the extension into the jQuery API
     */
    $.extend($.fn, {

        /**
         * options = {
         *   title: "Some title", 
         *   id: "my-id", 
         *   buttons: {
         *     "Name": Object || function   
         *   }
         * };
         * 
         * $(".selector").dialogX(options);
         * 
         * or 
         * 
         * $(".selector").dialogX("method", arguments);
         */
        dialogX: function () {
            var args = $.makeArray(arguments);
            var arg0 = args.shift();

            var dialog = $(this).data("dialogX");
            if (!dialog) {
                var options = $.extend(true, {}, $.fn.dialogX.defaults);
                if ($.isPlainObject(arg0)) {
                    options = $.extend(true, options, arg0);
                }

                dialog = new DialogX(this, options);
                dialog.handle().data("dialogX", dialog);
            } else {
                if (typeof arg0 == "string") {
                    var method = dialog[arg0];
                    if (method) {
                        var result = dialog[arg0].apply(dialog, args);
                        return (result == dialog ? dialog.handle() : result);
                    } else {
                        throw new __error("Unknown API method '" + arg0 + "'");
                    }
                } else
                    if ($.isPlainObject(arg0)) {
                        dialog.options(arg0);
                    } else {
                        throw new __error("Unknown API invocation: " + arg0 + " with args " + args);
                    }
            }

            return dialog.handle();
        }
    });

    /***********************************************************************
     * Closing dialog via ESCAPE key
     ***********************************************************************/

    $(document).ready(function () {
        $(document).keyup(function (event) {
            if (event.which == 27) { // ESCAPE key pressed
                $(this).find(".modal > .opened").each(function () {
                    var dialog = $(this);
                    if (dialog.dialogX("options").closeOnEscape) {
                        dialog.dialogX("close");
                    }
                });
            }
        });
    });


    /***********************************************************************
     * Limit TAB integration in open modals via keypress
     ***********************************************************************/

    $(document).ready(function (event) {

        $(document).keyup(function (event) {
            if (event.which == 9) { // TAB key pressed
                // There is actually a dialog opened
                if ($(".modal .opened").length) {
                    // Set timeout (to let the browser perform the tabbing operation
                    // and check the active element)
                    setTimeout(function () {
                        var activeElement = document.activeElement;
                        if (activeElement) {
                            var activeElementModal = $(activeElement).parents(".modal").find(".modal-body.opened");
                            // In the active modal dialog! Everything ok
                            if (activeElementModal.length != 0) {
                                return;
                            }
                        }

                        // Did not return; have to focus active modal dialog
                        $(".modal-body.opened").dialogX("focus");
                    }, 0);
                }
            }
        });

    });

    /**
     * Random helper functions; today: 
     * Returns true if value is a boolean
     * 
     * @param value the value to check
     * @return true if the value is a boolean
     */
    function __boolean(value) {
        return typeof value == "boolean";
    };

    /**
     * Creates a dialogX error with the given message
     * 
     * @param errorMessage stuff to signal the user
     * @returns the error object to be thrown
     */
    function __error(errorMessage) {
        new Error("[jquery.dialogX] " + errorMessage);
    };

    /**
     * DialogX plugin defaults (may be overriden)
     */
    $.fn.dialogX.defaults = {
        autoOpen: true,
        closeOnOverlayClick: false,
        removeOnClose: true,
        showCloseHandle: true,
        initialLoadText: "",
        closeOnEscape: false,
        beforeSend: null
    };

    /***********************************************************************
     * Localization
     ***********************************************************************/

    $.fn.dialogX.localization = {
        "cn": {
            ok: "确定",
            cancel: "取消",
            yes: "是",
            no: "否",
            confirm: "确认"
        },
        "en": {
            cancel: "Cancel"
        }
    };

    var lang = $.fn.dialogX.localization["cn"];

    /**
     * Localizes a given key using the selected language
     * 
     * @param key the key to localize
     * @return the localization of the key or the key itself if it could not be localized.
     */
    function localize(key) {
        return lang[key.toLowerCase()] || key;
    };

    /**
     * Creates a localized button and returns the buttons object specifying 
     * a number of buttons. May pass a buttons object to add the button to.
     * 
     * @param name to be used as a button label (localized)
     * @param functionOrOptions function or options to attach to the button
     * @param buttons object to attach the button to (may be null to create new one)
     * 
     * @returns buttons object or new object with the button added
     */
    function localizedButton(name, functionOrOptions, buttons) {
        buttons = buttons || {};
        buttons[localize(name)] = functionOrOptions;
        return buttons;
    };

    /**
     * Expose some localization helper methods via $.fn.dialogX.localization
     */
    $.extend($.fn.dialogX.localization, {
        localizedButton: localizedButton,
        get: localize,

        setLocale: function (key) {
            var localization = $.fn.dialogX.localization[key];

            if (localization == null) {
                throw new Error("No localizaton for language " + key);
            } else {
                lang = localization;
            }
        }
    });

    /**
     * Returns a localized cancel button
     * @return a buttons object containing a localized cancel button 
     *         (including its close functionality)
     */
    function localizedCancelButton() {
        return localizedButton("close", function () {
            $(this).dialogX("close");
        });
    };

    /***********************************************************************
     * jQuery load with before send integration
	 * copied from jQuery.fn.load but with beforeSendCallback support
     ***********************************************************************/

    function dialogLoad(url, completeCallback, beforeSendCallback) {
        // Don't do a request if no elements are being requested
        if (!this.length) {
            return this;
        }

        var selector, type, response,
			self = this,
			off = url.indexOf(" ");

        if (off >= 0) {
            selector = url.slice(off, url.length);
            url = url.slice(0, off);
        }

        // Request the remote document
        jQuery.ajax({
            url: url,

            // if "type" variable is undefined, then "GET" method will be used
            type: type,
            dataType: "html",
            beforeSend: beforeSendCallback,
            complete: function (jqXHR, status) {
                if (completeCallback) {
                    self.each(completeCallback, response || [jqXHR.responseText, status, jqXHR]);
                }
            }
        }).done(function (responseText) {

            // Save response for use in complete callback
            response = arguments;

            // See if a selector was specified
            self.html(selector ?

				// Create a dummy div to hold the results
				jQuery("<div>")

					// inject the contents of the document in, removing the scripts
					// to avoid any 'Permission Denied' errors in IE
					.append(responseText.replace(rscript, ""))

					// Locate the specified elements
					.find(selector) :

				// If not, just inject the full result
				responseText);

        });

        return this;
    }

    /**
     * Register opening of a dialog on annotated links
     */
    $(document).ready(function () {
        $("body").on("click", ".open-dialog", function (event) {
            event.preventDefault();

            var a = $(this);
            var id = a.attr("rel");
            var href = a.attr("href");
            var content = href;
            if (href == "#" || href == "###" || href == "javascript:;") {
                content = a.data("target");
            }

            var options = {
                modal: true
            };

            var element;

            if (id) {
                var e = $("#" + id);
                if (e.length) element = e;
            } else {
                id = a.data("dialogId");
            }

            if (!element) {
                if (id) {
                    options.id = id;
                }
            }

            if (a.data("dialogClass")) {
                options.modalClass = a.data("dialogClass");
            }

            if (a.attr("title")) {
                options.title = a.attr("title");
            }

            $.each($.fn.dialogX.defaults, function (key, value) {
                if (a.attr(key)) {
                    options[key] = a.attr(key) == "true";
                }
            });

            if (content && content != "#" && content != "###" && content != "javascript:;") {
                options.content = content;
                $(element || "<div></div>").dialogX(options);
            } else {
                a.attr("href", "javascript:;");

                options.removeOnClose = false;
                options.autoOpen = false;

                element = element || "<div></div>";

                // Pre initialize dialog
                $(element).dialogX(options);
                $(element).dialogX("open");
            }
        });
    });

    /***********************************************************************
     * Helpers：alert\confirm\prompt
     ***********************************************************************/
    var localizedButton = $.fn.dialogX.localization.localizedButton;

    var __helpers = {

        /**
         * Creates an alert displaying the given message.
         * Will call options.close on close (if specified).
         * 
         *   $.fn.dialogX.alert("This dialog is non intrusive", { 
         *       close: function() {
         *           alert("This one is!");
         *       }
         *   });
         * 
         * @param message to be displayed as the dialog body
         * @param options (optional) to be used when creating the dialog
         */
        alert: function (message, callback) {
            options = $.extend({}, {
                close: callback,
                modalClass: "small-modal modal-helpers"
            });

            message = '<div class="bigicon-box"><div class="pull-left big-icon"><i class="icon-exclamation-sign icon-3x"></i></div><div class="text">' + message + '</div></div>';

            var labels = $.extend({}, $.fn.dialogX.helpers.defaults.alert, options);

            var dialog = $("<div />");

            var closeCallback = options.close;
            delete options.close;

            var buttons = localizedButton(labels.buttonLabelOk, $.extend(__closeAndCall(closeCallback, dialog), { primary: true }));

            return __open(dialog, message, labels.title, buttons, options);
        },

        /**
         * Creates an confirm dialog displaying the given message.
         * 
         * Will call options.confirm on confirm (if specified).
         * Will call options.decline on decline (if specified).
         * 
         *   $.fn.dialogX.confirm("Is this dialog non intrusive?", {
         *       confirm: function() { alert("You said yes? Well... no"); }, 
         *       decline: function() { alert("You said no? Right choice!") }
         *   });
         * 
         * @param message to be displayed as the dialog body
         * @param options (optional) to be used when creating the dialog
         */
        confirm: function (message, yesCallback, noCallback) {
            options = $.extend({}, {
                confirm: yesCallback,
                decline: noCallback,
                modalClass: "small-modal modal-helpers"
            });
            message = '<div class="bigicon-box"><div class="pull-left big-icon"><i class="icon-question icon-3x"></i></div><div class="text">' + message + '</div></div>';
            options = $.extend({}, options);

            var labels = $.extend({}, $.fn.dialogX.helpers.defaults.confirm, options);

            var dialog = $("<div />");

            var confirmCallback = function () { };
            if (options.confirm) {
                confirmCallback = options.confirm;
            }
            delete options.confirm;

            var declineCallback = function () { };
            if (options.decline) {
                declineCallback = options.decline;
            }
            delete options.decline;

            var buttons = {};
            localizedButton(labels.buttonLabelYes, $.extend(__closeAndCall(confirmCallback, dialog), { primary: true }), buttons);
            localizedButton(labels.buttonLabelNo, __closeAndCall(declineCallback, dialog), buttons);

            return __open(dialog, message, labels.title, buttons, options);
        },

        /**
         * Creates an prompt dialog displaying the given message together with 
         * an element to input text in.
         * 
         * Will call options.ok on ok (if specified).
         * Will call options.cancel on cancel (if specified).
         * 
         *   $.fn.dialogX.prompt("What is your age?", {
         *       ok: function(event, value) { alert("Your age is: " + value); }, 
         *       cancel: function() { alert("Better tell me!"); }
         *   });
         * 
         * @param message to be displayed as the dialog body
         * @param options (optional) to be used when creating the dialog
         */
        prompt: function (message, callback) {
            // Special: Dialog has to be closed on escape or multiple inputs
            // with the same id will be added to the DOM!
            options = $.extend({}, {
                ok: callback,
                closeOnEscape: true
            });
            var labels = $.extend({}, $.fn.dialogX.helpers.defaults.prompt, options);

            var inputId = 'dialogX.helpers.prompt.input.id';
            var input = $("<input type='text' class='span4' />")
                                .attr("id", inputId)
                                .val(options.defaultValue || "");

            var html = $("<form class='form-stacked'></form>");
            html.append($("<label/>").attr("for", inputId).text(message));
            html.append(input);

            var dialog = $("<div />");

            var okCallback;
            if (options.ok) {
                var fn = options.ok;
                okCallback = function (event) { fn.call(dialog, input.val()); };
            }
            delete options.ok;

            var cancelCallback = options.cancel;
            delete options.cancel;

            var buttons = {};
            localizedButton(labels.buttonLabelOk, $.extend(__closeAndCall(okCallback, dialog), { primary: true }), buttons);
            localizedButton(labels.buttonLabelCancel, __closeAndCall(cancelCallback, dialog), buttons);

            // intercept form submit (on ENTER press)
            html.bind("submit", __closeAndCall(okCallback, dialog));

            __open(dialog, html, labels.title, buttons, options);
        },

        /**
         * Default helper options
         */
        defaults: {
            alert: {
                title: '提醒',
                buttonLabelOk: 'Ok'
            },

            prompt: {
                title: '提示',
                buttonLabelOk: 'Ok',
                buttonLabelCancel: 'Cancel'
            },

            confirm: {
                title: '确认',
                buttonLabelYes: 'Ok',
                buttonLabelNo: 'Cancel'
            }
        }
    };

    function __closeAndCall(callback, dialog) {
        return $.proxy(function (event) {
            event.preventDefault();
            $(this).dialogX("close");

            if (callback) {
                callback.call(this, event);
            }
        }, dialog || this);
    };

    function __open(e, message, title, buttons, options) {
        options.buttons = buttons;
        options.title = title;

        return e.append(message).dialogX(options);
    };

    $.extend(true, $.fn.dialogX, {
        helpers: __helpers
    });

    window.DialogX = $.fn.dialogX.helpers;

    $(document).ready(function () {
        //使模式框居中
        $(document).delegate(".modal:not('.modal-helpers')", "dialogX.content-update", function () {
            var _this = $(this);

            var resize = function () {
                var screenWidth = $(window).width(), screenHeight = $(window).height(); //当前浏览器窗口的 宽高 
                var scrolltop = $(document).scrollTop();//获取当前窗口距离页面顶部高度 
                var objLeft = (screenWidth - _this.width()) / 2;
                var objTop = (screenHeight - _this.height()) / 2 + scrolltop;

                _this.css({ top: objTop < 0 ? 0 : objTop + 'px' });
            }

            //浏览器窗口大小改变时 
            $(window).resize(function () {
                resize();
            });

            resize();
        });
    });

})(jQuery);
