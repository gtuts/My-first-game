var gamejs = require('gamejs');
var global = require('global');
var box2d = require('./Box2dWeb-2.1.a.3');
var global = require('global');

//------------------------------------------------------------------------------
// the floor
exports.floor = function(position, b2World) {
    
    exports.floor.superConstructor.apply(this, arguments);

    // setup sprite
    this.image = gamejs.image.load(global.DATA_PATH + "floor.png");
    this.rect = new gamejs.Rect(position);
    
    // setup physics - aabb is 1024x60
    var fixDef = new box2d.b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.2;
    var bodyDef = new box2d.b2BodyDef;
    bodyDef.type = box2d.b2Body.b2_staticBody;
    bodyDef.position.x = 512 / global.BOX2D_SCALE;
    bodyDef.position.y = 610 / global.BOX2D_SCALE; // 640 - 30
    fixDef.shape = new box2d.b2PolygonShape;
    fixDef.shape.SetAsBox(512 / global.BOX2D_SCALE, 30 / global.BOX2D_SCALE);
    
	this.b2Body = b2World.CreateBody(bodyDef);
	this.b2Body.CreateFixture(fixDef);
	
	// store ref for contact callback
	this.b2Body.SetUserData(this);
	this.kind = "floor";
                        
    return this;
};
gamejs.utils.objects.extend(exports.floor, gamejs.sprite.Sprite);

//------------------------------------------------------------------------------
// a tower block
exports.block = function(position, index) {
    
    exports.block.superConstructor.apply(this, arguments);

    // setup sprite
	if (index == "hero") {
		this.originalImage = gamejs.image.load(global.DATA_PATH + "hero.png");
	} else {
		this.originalImage = gamejs.image.load(global.DATA_PATH + "block0" + index + "_3.png");
	}
    this.image = this.originalImage;
    this.rect = new gamejs.Rect(position, this.image.getSize());

    this.index = index;
                        
    return this;
};
gamejs.utils.objects.extend(exports.block, gamejs.sprite.Sprite);

//------------------------------------------------------------------------------
// to physicalize tower blocks
exports.block.prototype.turnOnPhysics = function(b2World) {
    
    var fixDef = new box2d.b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.2;
    var bodyDef = new box2d.b2BodyDef;
    bodyDef.type = box2d.b2Body.b2_dynamicBody;
    bodyDef.position.x = this.rect.center[0] / global.BOX2D_SCALE;
    bodyDef.position.y = this.rect.center[1] / global.BOX2D_SCALE;
    fixDef.shape = new box2d.b2PolygonShape;
	var B2PADDING = 4;
    fixDef.shape.SetAsBox(
		(this.rect.width - B2PADDING) * 0.5 / global.BOX2D_SCALE,
		(this.rect.height - B2PADDING) * 0.5 / global.BOX2D_SCALE
		);
    
    this.b2Body = b2World.CreateBody(bodyDef);
    this.b2Body.CreateFixture(fixDef);
	
	// store ref for contact callback
	this.b2Body.SetUserData(this);
	if (this.index == "hero") {
		this.kind = "hero";
	} else {
		this.kind = "block";
		this.hp = 3;
	}			
}

//------------------------------------------------------------------------------
// update tower blocks
exports.block.prototype.update = function(dt) {
    
	// no need to grab position from body if not physicalized yet
    if (!this.b2Body) {
		return;
    }
	
	this.image = gamejs.transform.rotate(this.originalImage, gamejs.utils.math.degrees(this.b2Body.GetAngle()));
	this.rect.width = 0.0; this.rect.height = 0.0; // forces gamejs to use the rotated image size
	this.rect.x = (this.b2Body.GetPosition().x * global.BOX2D_SCALE) - this.image.getSize()[0] * 0.5;
	this.rect.y = (this.b2Body.GetPosition().y * global.BOX2D_SCALE) - this.image.getSize()[1] * 0.5;
}

//------------------------------------------------------------------------------
// update tower blocks
exports.block.prototype.hit = function() {
	
	this.hp--;
	if (this.hp > 0)
	{
		this.originalImage = gamejs.image.load(global.DATA_PATH + "block0" + this.index + "_" + this.hp + ".png");	
	}
}

//------------------------------------------------------------------------------
// block death
exports.block.prototype.die = function(b2World) {
    
	this.b2Body.SetUserData(null);
	b2World.DestroyBody(this.b2Body);		
}

//------------------------------------------------------------------------------
// drop area check
exports.block.prototype.checkDropArea = function(dropAreaWidth) {
    
	if (this.rect.x < (512 - dropAreaWidth * 0.5)) {
		this.hit();
	} else if ((this.rect.x + this.image.getSize()[0]) > (512 + dropAreaWidth * 0.5)) {
		this.hit();
	}
}

//------------------------------------------------------------------------------
// a enemy
exports.enemy = function(position, index, b2World, isLeft) {
    
    exports.enemy.superConstructor.apply(this, arguments);
	
	this.animFrame = 0;
	this.animTime = 0;
	this.ANIM_DELTA = 100;

    // setup sprite
	if (isLeft) {
		this.originalImage = [
			gamejs.image.load(global.DATA_PATH + "enemy0" + index + "_0.png"),
			gamejs.image.load(global.DATA_PATH + "enemy0" + index + "_1.png"),
			gamejs.image.load(global.DATA_PATH + "enemy0" + index + "_2.png"),
		];
	} else {
		this.originalImage = [
			gamejs.transform.flip(gamejs.image.load(global.DATA_PATH + "enemy0" + index + "_0.png"), true, false),
			gamejs.transform.flip(gamejs.image.load(global.DATA_PATH + "enemy0" + index + "_1.png"), true, false),
			gamejs.transform.flip(gamejs.image.load(global.DATA_PATH + "enemy0" + index + "_2.png"), true, false),
		];
	}
    this.image = this.originalImage[this.animFrame];
    this.rect = new gamejs.Rect(position, this.image.getSize());

    this.index = index;
	
    var fixDef = new box2d.b2FixtureDef;
    fixDef.density = 10.0;
    fixDef.friction = 0.1;
    fixDef.restitution = 0.2;
    var bodyDef = new box2d.b2BodyDef;
    bodyDef.type = box2d.b2Body.b2_dynamicBody;
    bodyDef.position.x = this.rect.center[0] / global.BOX2D_SCALE;
    bodyDef.position.y = this.rect.center[1] / global.BOX2D_SCALE;
    fixDef.shape = new box2d.b2CircleShape(1.0);
    
    this.b2Body = b2World.CreateBody(bodyDef);
    this.b2Body.CreateFixture(fixDef);
	
	// store ref for contact callback
	this.b2Body.SetUserData(this);
	this.kind = "enemy";
	this.hit = false;
	
	// initial impulse
	this.b2Body.ApplyImpulse(new box2d.b2Vec2(isLeft ? 100.0 : -100.0, 0.0), bodyDef.position);
	
    return this;
};
gamejs.utils.objects.extend(exports.enemy, gamejs.sprite.Sprite);

//------------------------------------------------------------------------------
// update enemies
exports.enemy.prototype.update = function(dt) {
    
	// 3 frames anim
	this.animTime += dt;
	if (this.animTime > this.ANIM_DELTA)
	{
		this.animTime -= this.ANIM_DELTA;
		this.animFrame = (this.animFrame + 1) % 3;
		this.image = this.originalImage[this.animFrame];
	}
	
	//this.image = gamejs.transform.rotate(this.originalImage, gamejs.utils.math.degrees(this.b2Body.GetAngle()));
	//this.rect.width = 0.0; this.rect.height = 0.0; // forces gamejs to use the rotated image size
	this.rect.x = (this.b2Body.GetPosition().x * global.BOX2D_SCALE) - this.image.getSize()[0] * 0.5;
	this.rect.y = (this.b2Body.GetPosition().y * global.BOX2D_SCALE) - this.image.getSize()[1] * 0.5;
}

//------------------------------------------------------------------------------
// enemy death
exports.enemy.prototype.die = function(b2World) {
    
	this.b2Body.SetUserData(null);
	b2World.DestroyBody(this.b2Body);		
}
