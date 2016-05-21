(function ($) {
    //行内编辑模式
    var inlineOptions = {
        toolbars: [
                     ['bold', 'italic', 'underline', 'strikethrough', 'forecolor', 'backcolor']
        ],
        initialFrameHeight: 70
    };

    //简单模式，若需为该模式增删插件或调整展示按钮，则可以修改该选项，下面的标准模式及高级模式类似
    var basicOptions = {
        toolbars: [
                 [
                    'fontfamily', 'fontsize', '|',
                    'bold', 'italic', 'underline', 'fontborder', 'backcolor', '|',
                    'justifyleft', 'justifycenter', 'justifyright', '|',
                    'link', 'emotion'
                 ]
        ],
        initialFrameHeight: true
    };

    //标准模式
    var standardOptions = {
        toolbars: [
                   [
            'fullscreen', 'undo', 'redo', 'removeformat', 'autotypeset', 'pasteplain', 'formatmatch', 'paragraph', 'fontfamily', 'fontsize', '|',
            'bold', 'italic', 'underline', 'fontborder', 'strikethrough', '|',
             'forecolor', 'backcolor', 'superscript', 'subscript', '|',
            'justifyleft', 'justifycenter', 'justifyright', '|',
            'rowspacingtop', 'rowspacingbottom', 'lineheight', '|',
            'insertorderedlist', 'insertunorderedlist', 'indent', '|',
            'inserttable', 'mergecells', 'splittocells', '|',
             'insertcode', 'print', 'searchreplace', 'template', 'horizontal', 'wordimage', '|',
            'imagenone', 'imageleft', 'imageright', 'imagecenter', '|',
            'link', 'unlink', 'anchor', '|',
            'emotion', 'map']
        ],
        initialFrameHeight: true
    };

    //高级模式
    var advancedOptions = {
        toolbars: [
                    ['fullscreen', 'undo', 'redo', '|',
            'bold', 'italic', 'underline', 'fontborder', 'strikethrough', 'superscript', 'subscript', 'removeformat', 'formatmatch', 'autotypeset', 'blockquote', 'pasteplain', '|', 'forecolor', 'backcolor', 'insertorderedlist', 'insertunorderedlist', 'selectall', 'cleardoc', '|',
            'rowspacingtop', 'rowspacingbottom', 'lineheight', '|',
            'customstyle', 'paragraph', 'fontfamily', 'fontsize', '|',
            'directionalityltr', 'directionalityrtl', 'indent', '|',
            'justifyleft', 'justifycenter', 'justifyright', 'justifyjustify', '|', 'touppercase', 'tolowercase', '|',
            'link', 'unlink', 'anchor', '|', 'imagenone', 'imageleft', 'imageright', 'imagecenter', '|',
            'simpleupload', 'insertimage', 'emotion', 'scrawl', 'insertvideo', 'music', 'attachment', 'map', 'gmap', 'insertframe', 'insertcode', 'webapp', 'pagebreak', 'template', 'background', '|',
            'horizontal', 'date', 'time', 'spechars', 'snapscreen', 'wordimage', '|',
            'inserttable', 'deletetable', 'insertparagraphbeforetable', 'insertrow', 'deleterow', 'insertcol', 'deletecol', 'mergecells', 'mergeright', 'mergedown', 'splittocells', 'splittorows', 'splittocols', 'charts', '|',
            'print', 'preview', 'searchreplace', 'help', 'drafts']
        ],
        initialFrameHeight: true
    }

    //changed by FuzhePan - 开放一个初始化编辑器的方法，以便在前端通过 JS 适时创建一个编辑器
    var initUEditor = function (element) {
        var ueditor_id = $(element).attr('id');

        //编辑器选项
        var options = {};

        //全局选项
        var commonOptions = {
            menubar: false,
            script_url: '/scripts/ueditor/ueditor.all.min.js',
            language: "zh-cn",
            content_css: "/scripts/ueditor/themes/default/css/ueditor.css"
        };
        $.extend(options, commonOptions);

        //自定义选项
        var data_options = $(element).data("options");
        $.extend(options, data_options);

        //编辑器模式
        if (data_options.editorMode == "Advanced") {
            $.extend(options, advancedOptions);
        }
        else if (data_options.editorMode == "Standard") {
            $.extend(options, standardOptions);
        }
        else if (data_options.editorMode == "Basic") {
            $.extend(options, basicOptions);
        }
        else {
            $.extend(options, inlineOptions);
        }

        //初始化htmlEditor
        var editor = UE.getEditor(ueditor_id, {
            toolbars: options.toolbars,
            initialFrameHeight: options.initialFrameHeight
        });
        return editor;
    }

    window.initUEditor = initUEditor;
})(jQuery);

$(document).ready(function () {
    //绑定ueditor插件
    $("textarea[plugin*='ueditor']").livequery(function () {
        initUEditor(this);
    });
});