var gamejs = require('gamejs');
var global = require('global');


//------------------------------------------------------------------------------
// background
exports.bg = function() {
    
    exports.bg.superConstructor.apply(this, arguments);

    // setup sprite
    this.image = gamejs.image.load(global.DATA_PATH + "background.png");
    this.rect = new gamejs.Rect([0, 0]);
    return this;
};
gamejs.utils.objects.extend(exports.bg, gamejs.sprite.Sprite);


//------------------------------------------------------------------------------
// extra
exports.extra = function() {
    
    exports.extra.superConstructor.apply(this, arguments);

    // setup sprite
    this.image = gamejs.image.load(global.DATA_PATH + "extra.png");
    this.rect = new gamejs.Rect([0, 0]);

    return this;
};
gamejs.utils.objects.extend(exports.extra, gamejs.sprite.Sprite);

//------------------------------------------------------------------------------
// vertical bar
exports.vbar = function(x) {
    
    exports.vbar.superConstructor.apply(this, arguments);

    // setup sprite
    this.image = gamejs.image.load(global.DATA_PATH + "vbar.png");
    this.rect = new gamejs.Rect([x, 160]);

    return this;
};
gamejs.utils.objects.extend(exports.vbar, gamejs.sprite.Sprite);

//------------------------------------------------------------------------------
// message
exports.msg = function(name, position) {
    
    exports.msg.superConstructor.apply(this, arguments);

    // setup sprite
    this.image = gamejs.image.load(global.DATA_PATH + "msg_" + name + ".png");
    this.rect = new gamejs.Rect(position);
	
	this.name = name;

    return this;
};
gamejs.utils.objects.extend(exports.msg, gamejs.sprite.Sprite);

//------------------------------------------------------------------------------
// timer
exports.timer = function() {
    
    exports.timer.superConstructor.apply(this, arguments);

    // setup sprite
    this.image = gamejs.image.load(global.DATA_PATH + "timer.png");
    this.rect = new gamejs.Rect([950, 40]);
	
    return this;
};
gamejs.utils.objects.extend(exports.timer, gamejs.sprite.Sprite);
