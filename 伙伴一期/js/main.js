// JavaScript Document
$(function(){
    $(".textarea-box textarea").focus(function(){
    $("#publishwrap").removeClass("hidden-actionwrap");	
  	});	
	
	$(".nav-tabs-1 .active").livequery('click',function(e){
      e.preventDefault() ;
	  $(".hb-sidebar").addClass("hb-sidebar-2");	
	  $('.nav-tabs-1').slimScroll({
      height: '560px',
	  color:'#fafafa',
	  size:'5px',
	  width:'80px'
	});
	});	
	
   $(".hb-wrap .content-right .media-list li:last-child").css("border-bottom-style","none");
   $(".hb-wrap .content-right .media-list li:last-child").css("padding-bottom",0);
 
       //滚动条
$(".scroll-pane-box").livequery(function () {
	$(this).jScrollPane({
		showArrows: false,
		maintainPosition: false,
		autoReinitialise: true
	}).data('jsp');
});
     $("body").on("click", ".publishwrap .textarea-box", function() {
            if ($(this).parents(".publishwrap").is(".hidden-actionwrap") == false && $(this).parents(".publishwrap").is(".hidden-textarea") == false) return;

            $(this).parents(".publishwrap").removeClass("hidden-actionwrap").removeClass("hidden-textarea"); //.find('textarea'.focus();
            var firstInput = $(this).closest("form").find("input:visible:first");
            if (firstInput.length > 0) {
                firstInput.focus();
            } else {
                $(this).find("textarea").focus();
            }
        });
		
		    //给hb-content最小的高度
      function setContentMinHeight() {
        $(".hb-content").livequery(function () {
            $(this).css({ "min-height": $(window).height() });
        });
     }
	
	 setContentMinHeight();

    $(window).resize(function () {
        setContentMinHeight();
    });
	
	
    //行内编辑框
    $('.u-act-textwrap textarea').livequery(function () {
        var $this = $(this);
        var myActivityCreator = $this.parents('.u-act-creator');
        var myInlineWrap = $this.parents('.u-inline-wrap');
        $this.focus(function () {
            myActivityCreator.addClass('active focus');
            myInlineWrap.addClass('active');
        }).blur(function () {
            myActivityCreator.removeClass('focus');
            myInlineWrap.removeClass('active');
        }).bind('input propertychange', function () {
            var myTextareaVal = $this.val();
            $this.prev('div').find('span').html(myTextareaVal.replace(/[\r\n]/g, "<br />"));
        });
    });

    //二级导航判断
    if ($('.hb-sidebar').hasClass('hb-sidebar-2')) {
        $('.hb-content-box').addClass('hb-subnav-content');
    }
   
  //解决IE8不包含indexOf方法的问题
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (elt /*, from*/) {
            var len = this.length >>> 0;

            var from = Number(arguments[1]) || 0;
            from = (from < 0) ? Math.ceil(from) : Math.floor(from);
            if (from < 0) {
                from += len;
            }

            for (; from < len; from++) {
                if (from in this &&
                    this[from] === elt)
                    return from;
            }

            return -1;
        };
    }
    //对编辑表单中textarea的内容进行htmldecode
        $("textarea[plugin!='tinymce']:not('.mce-multiline')").livequery(function () {
            var value = $(this).val();
            if (value) {
                value = value.replace(new RegExp("<br />", "g"), "\n");
                value = value.replace(new RegExp("&nbsp;", "g"), " ");
                //value = $('<div />').html(value).text();
                $(this).val(value);
            }
        });

        //对编辑表单中textbox的内容进行htmldecode
        $("input[type='text']").livequery(function () {
            var value = $(this).val();
            if (value) {
                value = value.replace(new RegExp("&nbsp;", "g"), " ");
                //value = $('<div />').html(value).text();
                $(this).val(value);
            }
        });


})