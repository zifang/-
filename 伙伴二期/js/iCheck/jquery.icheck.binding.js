(function ($) {
    $(document).ready(function () {

        //使checkbox和radiobutton使用iCheck的样式
        $("input[type='radio']:not(.icheck-ignore),input[type='checkbox']:not(.icheck-ignore)").livequery(function () {
            $(this).iCheck({
                checkboxClass: 'icheckbox_minimal-blue',
                radioClass: 'iradio_minimal-blue',
                increaseArea: '20%' // optional
            });
        });

        //iCheck全选/取消动作
        $.fn.checkAll = function (itemName) {
            var items = $("input[type='checkbox'][name='" + itemName + "']");

            if ($(this)[0].checked) {
                for (var i = 0; i < items.length; i++) {
                    $(items[i]).iCheck('check');
                }
            }
            else {
                for (var i = 0; i < items.length; i++) {
                    $(items[i]).iCheck('uncheck');
                }
            }
        }
    });
})(jQuery);
