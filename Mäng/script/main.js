var gamejs = require('gamejs');
var global = require('global');
var box2d = require('./Box2dWeb-2.1.a.3');
var object = require('object');
var level = require('level');
var ui = require('ui');

//------------------------------------------------------------------------------
// IE doesn't take Ogg
var AUDIO_EXT = ".ogg";
var IE = false;
if (window.navigator.appName == "Microsoft Internet Explorer") {
	AUDIO_EXT = ".mp3";
	IE = true;
}

//------------------------------------------------------------------------------
// preload everything, call main when done
var data = [
	global.DATA_PATH + "block00_1.png",
	global.DATA_PATH + "block00_2.png",
	global.DATA_PATH + "block00_3.png",
	global.DATA_PATH + "block01_1.png",
	global.DATA_PATH + "block01_2.png",
	global.DATA_PATH + "block01_3.png",
	global.DATA_PATH + "block02_1.png",
	global.DATA_PATH + "block02_2.png",
	global.DATA_PATH + "block02_3.png",
	global.DATA_PATH + "block03_1.png",
	global.DATA_PATH + "block03_2.png",
	global.DATA_PATH + "block03_3.png",
	global.DATA_PATH + "msg_crown.png",
	global.DATA_PATH + "msg_drop.png",
	global.DATA_PATH + "msg_end.png",
	global.DATA_PATH + "msg_fail.png",
	global.DATA_PATH + "msg_pick.png",
	global.DATA_PATH + "msg_hero.png",
	global.DATA_PATH + "msg_win.png",
	global.DATA_PATH + "enemy00_0.png",
	global.DATA_PATH + "enemy00_1.png",
	global.DATA_PATH + "enemy00_2.png",
	global.DATA_PATH + "enemy01_0.png",
	global.DATA_PATH + "enemy01_1.png",
	global.DATA_PATH + "enemy01_2.png",
	global.DATA_PATH + "hero.png",
	global.DATA_PATH + "hero.png",
	global.DATA_PATH + "floor.png",
	global.DATA_PATH + "timer.png",
	global.DATA_PATH + "extra.png",
    global.DATA_PATH + "background.png",
	global.DATA_PATH + "vbar.png",
	global.DATA_PATH + "tune_building" + AUDIO_EXT,
	global.DATA_PATH + "tune_defending" + AUDIO_EXT,
	global.DATA_PATH + "tune_end" + AUDIO_EXT,
	global.DATA_PATH + "tune_lost" + AUDIO_EXT,
	global.DATA_PATH + "tune_win" + AUDIO_EXT,
];
gamejs.preload(data);
gamejs.ready(main);

//------------------------------------------------------------------------------
// game state
var STATE_BUILDING = 0;
var STATE_DEFENDING = 1;
var STATE_LOST = 2;
var STATE_WIN = 3;
var gState = STATE_BUILDING;
var gStateTimer = 0.0;
var gDefendingNextSpawn = 0.0;
var gDefendingNextLeft = true;

//------------------------------------------------------------------------------
// gameplay elements
var NUM_BLOCK_KINDS = 4;
var gBlockStore = null;
var gBlockStoreInventory = null;
var gBlockStoreYOffsets = null;
var gBlockSet = null;
var gBlockPickup = null;
var gFloor = null;
var gEnemySet = null;
var gLevelIndex = 0;

//------------------------------------------------------------------------------
// Box2D stuff
var b2World = null;
var b2Draw = false;

//------------------------------------------------------------------------------
// UI stuff
var gFont = null;
var gExtra = null;
var gVBarLeft = null;
var gVBarRight = null;
var gMsg = null;
var gTimer = null;
var gBg = null;

//------------------------------------------------------------------------------
// UI stuff
var gTune = null;

//------------------------------------------------------------------------------
// entry point
function main() {
    init(gLevelIndex);
    gamejs.time.fpsCallback(update, this, 24);
}

//------------------------------------------------------------------------------
// create everything
function init(levelIndex) {

    // set display size
    gamejs.display.setMode([1024, 640]);
    
    // create Box2D world
    b2World = new box2d.b2World(
       new box2d.b2Vec2(0, 10),  // gravity
       true                      // allow sleep
    );

    // add our contact listener
    // http://stackoverflow.com/questions/10878750/box2dweb-collision-contact-point
    var b2Listener = box2d.Box2D.Dynamics.b2ContactListener;
	var listener = new b2Listener;
    listener.BeginContact = function(contact) {
        //console.log(contact.GetFixtureA().GetBody().GetUserData());
    }
    listener.EndContact = function(contact) {
        // console.log(contact.GetFixtureA().GetBody().GetUserData());
    }
    listener.PostSolve = function(contact, impulse) {
		var objectA = contact.GetFixtureA().GetBody().GetUserData();
		var objectB = contact.GetFixtureB().GetBody().GetUserData();
        if ((objectA.kind == "enemy" && objectB.kind == "hero") || (objectA.kind == "hero" && objectB.kind == "enemy")) {
			if (gState == STATE_DEFENDING) {
				gState = STATE_LOST;
				gMsg = new ui.msg("fail", [0, 0]);
				playTune("lost");
			}
		} else if (objectA.kind == "enemy" && objectB.kind == "block") {
			objectA.hit = true;
			objectB.hit();
		} else if (objectA.kind == "block" && objectB.kind == "enemy") {
			objectA.hit();
			objectB.hit = true;
		}
    }
    listener.PreSolve = function(contact, oldManifold) {
        // PreSolve
    }
    b2World.SetContactListener(listener);
	
    // setup debug draw
    var debugDraw = new box2d.b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("gjs-canvas").getContext("2d"));
    debugDraw.SetDrawScale(global.BOX2D_SCALE);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(box2d.b2DebugDraw.e_shapeBit | box2d.b2DebugDraw.e_jointBit);
    b2World.SetDebugDraw(debugDraw);

    // create block store
	gBlockStoreInventory = level.constants[levelIndex].blocks.slice(0); // NB: array deep copy http://stackoverflow.com/a/7486130/1005455
    gBlockStore = new gamejs.sprite.Group();
	gBlockStoreYOffsets = new Array();
	if (gLevelIndex >= 1) {
		gBlockStore.add(new object.block([20, 166], "hero"));
	}
	var currentY = 250;
    for (var i=0; i<NUM_BLOCK_KINDS; i++) {
		if (gBlockStoreInventory[i] > 0) {
			var newBlock = new object.block([40, currentY], i);
			gBlockStore.add(newBlock);
			gBlockStoreYOffsets[i] = currentY;
			currentY += newBlock.image.getSize()[1] + 20;
		}
    }
   
    // create empty block & enemy sets
    gBlockSet = new gamejs.sprite.Group();
    gEnemySet = new gamejs.sprite.Group();
    
    gBg = new ui.bg();
  
    // create floor
    gFloor = new object.floor([0, 475], b2World);

	// create UI
	gFont = new gamejs.font.Font("20px sans-serif");
	gExtra = new ui.extra();
   
	gVBarLeft = new ui.vbar(512 - level.constants[gLevelIndex].dropAreaWidth * 0.5);
	gVBarRight = new ui.vbar(512 + level.constants[gLevelIndex].dropAreaWidth * 0.5);
	gTimer = new ui.timer();
	
	if (levelIndex == 0) {
      //gMsg = new ui.msg("pick", [150, 130]);
      gMsg = new ui.msg("pick", [0, 0]);
	}
		
	gState = STATE_BUILDING;
	
    console.log("taustamussi saab sisse/välja lülitada failist 'main.js':\n" + 
                "kohe selle rea all, mis antud teadet kuvab, on funktsioon playTune,"+ 
                "mis tuleks välja kommenteerida, kui pidev muusika hakkab mängu testides närvidele käima"+ 
                "samamoodi on teiste helidega\nÄra unusta lõpuks seda siis uuesti sisse panna");
    playTune("building");
  
    /* 
      kommentaare kasutatakse koodis märkmete tegemiseks iseenda või koostööpartnerite jaoks.
      samuti kasutatakse neid tihti hetkel mittevajlikke osade ajutiselt välja lülitamiseks.
      nii nagu siin üleval pool on taustamuss ajutiselt välja kommenteeritud.
      lihtsalt selle pärast, et ei häiriks kogu aeg.
      proovi ülalpool oleva funktsiooni playTune("building"); eest kaks kaldkriipsu ära võtta ja 
      testi mängu. Peaksid kuulma taustamuusikat.
      
      javascriptis on kahte tüüpi kommentaare: mitmel real olev kommentaar on 
      sarnaste tähiste vahel nagu css-is. või nagu seesama kommentaar siin.
    */
    
    // üherealine kommentaar algab kahe kaldkriipsuga nagu see rida.
  
    
}
    
//------------------------------------------------------------------------------
// gather input then draw
function update(dt) {
    
    var events = gamejs.event.get();
    debugInput(events);

    // update game state
    switch (gState)
    {
        case STATE_BUILDING: updateBuilding(events, dt); break;
        case STATE_DEFENDING: updateDefending(events, dt); break;
        case STATE_LOST: updateLost(events, dt); break;
        case STATE_WIN: updateWin(events, dt); break;
    }
	gStateTimer += dt;

    // update physics
    b2World.Step(
        1 / 24,  //frame-rate
        10,      //velocity iterations
        10       //position iterations
    );
    b2World.ClearForces();

    // update gameplay elements
    gBlockSet.forEach(function(block) {
        block.update(dt);
		
		// in building state, hit blocks getting outside the drop area
		if (gState == STATE_BUILDING) {
			block.checkDropArea(level.constants[gLevelIndex].dropAreaWidth);
		}
		
		if (block.type != "hero" && block.hp == 0) {
			block.die(b2World);
			gBlockSet.remove(block);
		}
    });
    gEnemySet.forEach(function(enemy) {
        enemy.update(dt);
		if (enemy.hit) {
			enemy.die(b2World);
			gEnemySet.remove(enemy);
		}
    });

    draw();    
}

//------------------------------------------------------------------------------
// debug keys
function debugInput(events) {
    
    events.forEach(function(event) {
        if (event.type === gamejs.event.KEY_DOWN) {
            if (event.key === gamejs.event.K_b) {
                b2Draw = true;
            };
        } else if (event.type === gamejs.event.KEY_UP) {
            if (event.key === gamejs.event.K_b) {
                b2Draw = false;
            };
        }
    });
}

//------------------------------------------------------------------------------
// building state
function updateBuilding(events, dt) {
    
    events.forEach(function(event) {
		// block picking
        if (event.type === gamejs.event.MOUSE_DOWN) {
            gBlockStore.forEach(function(block) {
                if (block.rect.collidePoint(event.pos)) {
                    if (block.index == "hero") {
						// picked a princess
                        gBlockStore.remove(block);
                        gBlockPickup = block;
						
						if (gLevelIndex == 0) {
							gMsg = new ui.msg("crown", [0, 0]);
						}
                    } else {
						
						if (gMsg) {
							gMsg = new ui.msg("drop", [0, 0]);
						}
						
						// picked a regular block
						if (0 == (--gBlockStoreInventory[block.index])) {
							// that was the last one
							gBlockStore.remove(block);
							gBlockPickup = block;
							
						} else {
							// there are blocks remaining, create a new instance
							gBlockPickup = new object.block(block.rect.topleft, block.index);
						}
                    }
                }
            });
		// block dropping
        } else if (event.type === gamejs.event.MOUSE_UP) {
            if (gBlockPickup) {
				if (gMsg) {
					gMsg = null;
				}
				
                gBlockPickup.turnOnPhysics(b2World);
                gBlockSet.add(gBlockPickup);
                if (gBlockPickup.index == "hero") {
                    // switch to defending state!
                    gState = STATE_DEFENDING;
                    gStateTimer = 0.0;
                    gDefendingNextSpawn = 2000.0;
                    gDefendingNextLeft = true;
					playTune("defending");
                } else  {
					// no more blocks in store, add the princess (level 0 - tutorial)
					if (gBlockStore._sprites.length == 0) {
						if (gLevelIndex == 0) {
							gMsg = new ui.msg("hero", [0, 0]);
							gBlockStore.add(new object.block([20, 250], "hero"));
						}
					}
				}
				
                gBlockPickup = null;
            }
		// block dragging
        } else if (event.type === gamejs.event.MOUSE_MOTION) {
            if (gBlockPickup) {
                gBlockPickup.rect.center = event.pos;
            }
        }
    });
}

//------------------------------------------------------------------------------
// defending state
function updateDefending(events, dt) {

    if (gStateTimer > gDefendingNextSpawn) {
        
		// spawn enemies
		var enemyIndex = Math.random() < 0.1 ? 1 : 0; // spawn a goat once in a while
        if (gDefendingNextLeft) {
            gEnemySet.add(new object.enemy([0, 502], enemyIndex, b2World, gDefendingNextLeft));
        } else {
            gEnemySet.add(new object.enemy([1024-80, 502], enemyIndex, b2World, gDefendingNextLeft));
        }                
        
        gDefendingNextSpawn += 2000.0;
        gDefendingNextLeft = !gDefendingNextLeft;
    }
    
	var duration = level.constants[gLevelIndex].duration;
	var timeLeft = (duration - gStateTimer) / 1000;
	if (timeLeft < 0) {
		if (gLevelIndex == (level.constants.length-1)) {
			gMsg = new ui.msg("end", [0, 0]);
			playTune("end");
		} else {
			gMsg = new ui.msg("win", [0, 0]);
			playTune("win");
		}
		gState = STATE_WIN;
	}
}

//------------------------------------------------------------------------------
// lost state
function updateLost(events, dt) {
	
	var restart = false;
    events.forEach(function(event) {
        if (event.type === gamejs.event.KEY_UP) {
            if (event.key === gamejs.event.K_SPACE) {
                restart = true;
            };
        } else if (event.type === gamejs.event.MOUSE_UP) {
			restart = true;
        }
    });
	
	if (restart) {
		gMsg = null;
		init(gLevelIndex);
	}
}

//------------------------------------------------------------------------------
// win state
function updateWin(events, dt) {

	// skip, the game is finished
	if (gLevelIndex == (level.constants.length-1)) {
		return;
	}
	
	var next = false;
    events.forEach(function(event) {
        if (event.type === gamejs.event.KEY_UP) {
            if (event.key === gamejs.event.K_SPACE) {
				next = true;
            };
        } else if (event.type === gamejs.event.MOUSE_UP) {
			next = true;
        }
    });	
	
	if (next) {
		gMsg = null;
		init(++gLevelIndex);
	}		
}

//------------------------------------------------------------------------------
// draw
function draw() {
    
    gamejs.display.getSurface().fill('white');
    //gamejs.display.getSurface();
    var mainSurface = gamejs.display.getSurface();
    
	// those need to be drawn before the floor
    // draw background
	gBg.draw(mainSurface);
    
	if (gState == STATE_BUILDING)
	{
		gVBarLeft.draw(mainSurface);
		gVBarRight.draw(mainSurface);
	}

    gFloor.draw(mainSurface);

	// draw message
	if (gMsg) {
		gMsg.draw(mainSurface);
	}

	if (gBlockPickup) {
        gBlockPickup.draw(mainSurface);
    }

	gBlockSet.draw(mainSurface);
    
	gEnemySet.draw(mainSurface);
    
    if (b2Draw) {
        b2World.DrawDebugData();
    }
  
	// draw extra layer
	gExtra.draw(mainSurface);
	
    // draw game state UI
    switch (gState)
    {
        case STATE_BUILDING: drawBuilding(mainSurface); break;
        case STATE_DEFENDING: drawDefending(mainSurface); break;
        case STATE_LOST: drawLost(mainSurface); break;
        case STATE_WIN: drawWin(mainSurface); break;
    }
	
	// draw level #
	mainSurface.blit(gFont.render("Tase " + (gLevelIndex + 1)), [950,10]);
}

//------------------------------------------------------------------------------
// draw building
function drawBuilding(surface) {
	
	gBlockStore.draw(surface);
	
	// draw remaining blocks count
	for (var i=0; i<NUM_BLOCK_KINDS; ++i) {
		if (gBlockStoreInventory[i] > 0) {
			surface.blit(gFont.render("" + gBlockStoreInventory[i] + "x"), [16, gBlockStoreYOffsets[i] + 15]);
		}
	}
	
	//surface.blit(gFont.render("BUILDING"), [10,10]);
}

//------------------------------------------------------------------------------
// draw defending
function drawDefending(surface) {
	
	var duration = level.constants[gLevelIndex].duration;
	var timeLeft = (duration - gStateTimer) / 1000;
  
	gTimer.draw(surface);
    
    if(timeLeft < 10) {
      surface.blit(gFont.render(Math.round(timeLeft)), [977,60]);
    } else {
      surface.blit(gFont.render(Math.round(timeLeft)), [970,60]);
    }
	//surface.blit(gFont.render("DEFENDING " + timeLeft), [10,10]);
}

//------------------------------------------------------------------------------
// draw lost
function drawLost(surface) {
	
	//surface.blit(gFont.render("LOST"), [10,10]);
}

//------------------------------------------------------------------------------
// draw win
function drawWin(surface) {
	
	//surface.blit(gFont.render("WIN"), [10,10]);
}

//------------------------------------------------------------------------------
// music control
function playTune(name) {
	
	// drop sound support for the moment on IE, doesn't want to work (files too big?)
	if (IE) {
		return;
	}
	
	if (gTune)
	{
		gTune.stop();
	}
	//var snd = new Audio(global.DATA_PATH + "tune_" + name + AUDIO_EXT);
	gTune = new gamejs.mixer.Sound(global.DATA_PATH + "tune_" + name + AUDIO_EXT);
	gTune.play(true);
}


// paar lisafunktsiooni meie eksami jaoks
//

var mkSplash = document.querySelector(".container-intro");
var mkButton = document.querySelector(".intro-image").addEventListener("click", function( event ) {
   hideSplash();
  }, false);

function hideSplash(){
  mkSplash.style.display = "none";
  playTune("win");
}

