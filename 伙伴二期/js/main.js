$(function(){
	//给hb-content设置最小高度
	setContentH();

    //提交表单后，隐藏模板名称输入框，显示文本
    $(".temp-title-box .send-btn").on("click",function(){
        $(this).parents(".edit-temp-name").hide().siblings(".show-text").show();
    });

    //点击编辑，弹出模板名称编辑框
    $(".show-text .edit-btn").on("click",function(e){
        e.preventDefault();
        $(this).parent().hide().siblings().show();
    });


    //显示隐藏工作计划编辑框
    $(".plan-box .edit-btn").on("click",function(e){
        e.preventDefault();
        $(this).parent().hide().siblings().show();
    });

    $(".plan-box .send-btn").on("click",function(){
        $(this).parents(".edit-box").hide().siblings(".text-box").show();
    });

    //展开折叠选择框
    $(".show-hide-block").on("click",function(){
        var $this = $(this);
        if ($this.parent().find(".block").is(":visible")) {
            $(".block").slideUp(300);
        } else {
            $(".block").slideDown(300);
        }

    });
});

$(window).resize(function () {
	// body...
	setContentH();
});

//function
function setContentH(){
	var $docHeight=$(window).height();
	$(".hb-content").livequery(function(){
		$(this).css("height",$docHeight);
	});
}