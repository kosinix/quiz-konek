jQuery(document).ready(function ($) {
    var $body = $('body');

    $('.toggler').on('click', function () {
        $body.toggleClass('hide-menu');
        if ($body.hasClass("hide-menu")) {
            setCookie('hideNav', 'true');
        } else {
            setCookie('hideNav', 'false');
        }
    })
    
    $('#sidebar').on('click', '.nav-expander', function (e) {
        e.preventDefault()
        e.stopPropagation()
        var $navItem = $(this).parents('.nav-item')
        $navItem.toggleClass('expanded')
    })

    $('#sidebar').on('click', '.nav-employee a', function (e) {
        console.log(e.isPropagationStopped())
        if(e.isPropagationStopped()) return false
        $body.addClass('hide-menu');
        setCookie('hideNav', 'true');
    })

    $('[data-toggle="tooltip"]').tooltip()
    
});

/**
 * Convert 0-based integer into excel column letters
 * 
 * @param {Number} n 
 * @returns Letter/s
 */
var nToAZ = function (n) {
    return (a = Math.floor(n / 26)) >= 0
        ? nToAZ(a - 1) + String.fromCharCode(65 + (n % 26))
        : '';
}

/**
 * Excel column letters into 1-based integer. Example: A => 1, AA => 27
 * 
 * @param {String} val
 * @returns Number
 */
var AZToN = function (val) {
    var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0;

    for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {
        result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1);
    }

    return result;
};