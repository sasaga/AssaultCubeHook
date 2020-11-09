/*
Filename:    assaultcubeHooking.js
Description: This project hacks the AssaultCube game using frida and Hooking techniques
Author:      Samir sanchez garnica @sasaga92
command:     Frida "Name Process" -l assaultcubeHooking.js 
*/


/* This is the list to global variable */

var nameProcess = Process.getModuleByName('assaultcube');
var nameProcessBaseAddress = nameProcess.base;
var assaultCube = assaultCube || {};

var player = {
    'ptrPtrPlayer':getPointer(nameProcessBaseAddress.add(0x1abf08)),                  // This is a player pointer to pointer
    'offsetHealth':0x110,                       // This is a offset player to health
    'offsetBulletMachineGun':0x168,             // This is a offset player to Bullet
    'offsetBulletMachineGunCharger':0x140,      // This is a offset player to Bullet
    'offsetBulletSniper':0x164,                 // This is a offset player to Bullet
    'offsetBulletSniperCharger':0x13c,          // This is a offset player to Bullet
    'offsetBulletGun':0x154,                    // This is a offset player to Bullet
    'offsetBulletGunCharger':0x12c,             // This is a offset player to Bullet
    'offsetGrenade':0x170,                      // This is a offset player to Grenades
    'offsetArmor':0x114,                        // This is a offset player to Grenades
    'offsetPlayerName':0x241,                   // This is a offset player to Name
    'ptrOffsetFuncHealth':0x2c103,              // This is a offset function call to Health
    'ptrOffsetFuncShooting':0x103f6f,            // This is a offset function call to Shooting get pointer player (init function 0x103d74)
    'xMouse': 0x44,
    'yMouse':0x48,
    'xPos':0x38,
    'yPos':0x3c,
    'zPos':0x40,
}


var pointerPlayer = player['ptrPtrPlayer']

var Enemy = {}

//this function detects any player that shoots and saves its pointer to an object that will be processed by the aimbot
function getPlayerShot(){
    var pointerCallFunctionShot = nameProcessBaseAddress.add(player['ptrOffsetFuncShooting']);
    var pointerPlayer = player['ptrPtrPlayer']
    Interceptor.attach(pointerCallFunctionShot, {
        onEnter: function(args){
            var pointerPlayerEnemy = getPointer(this.context['r13'].add(0x10));
            if(parseInt(pointerPlayer) != parseInt(pointerPlayerEnemy)){
                Enemy[pointerPlayerEnemy] = pointerPlayerEnemy;
            }
        }
    });
}

/*  This is the list of global functions */

//This function reads the amount and memory content of an assigned pointer
function readMemory(pAddress, size) {
    return Memory.readByteArray(ptr(pAddress), size);
}

//This function extracts UTF-8 string from an assigned pointer
function readMemoryString(pAddress) {
    return Memory.readUtf8String(ptr(pAddress));
}

function getPointer(pAddress){
    return Memory.readPointer(ptr(pAddress));
}

//This function write the amount and memory content of an assigned pointer
function writeMemory(pAddress, opcodes){
    return Memory.writeByteArray(ptr(pAddress), opcodes);
}

//This function extracts Float value from an assigned pointer
function readMemoryFloat(pAddress) {
    return Memory.readFloat(ptr(pAddress));
}

//This function write Float value from an assigned pointer
function writeMemoryFloat(pAddress, value) {
    return Memory.writeFloat(ptr(pAddress), value);
}

//This function returns the value written in memory as an integer
function getIntValueOpcodes(bytes){
    var byte = new Uint8Array(bytes);
    var strOpcodes = [];
    var temp = "0x";
    for(var i = 0; i < byte.length; i++) {

        strOpcodes.push(byte[i].toString(16));
    }
    strOpcodes = strOpcodes.reverse();

    for (var index = 0; index < strOpcodes.length; index++) {
        temp += strOpcodes[index];
    }
    return parseInt(temp);
}

// This function looks for patterns in the memory heap, returns an object
function scanHeap(searchValue, protection){
    var foundValues = [];

    if(typeof protection === 'undefined')
        protection = 'rw-';

    var ranges = Process.enumerateMallocRangesSync({
        protection: protection,
        onMatch: function(address, size){
            var results = Memory.scanSync(address.base, address.size, searchValue);
            if(results.length > 0 ){
                foundValues.push(results[0])
            }
        },
        onComplete: function(){}
    });
    return foundValues;
}

// This function is responsible for searching the values in memory, its action should first search for the value in the format mem_types,
// then call it again with the new value and the previously invoked object
function searchMemory(searchValue, chunkFound){
    if (typeof chunkFound === 'undefined'){
        return scanHeap(searchValue)
    }

    var foundValuesFinish = []

    for (var index = 0; index < chunkFound.length; index++) {
        var results = Memory.scanSync(ptr(chunkFound[index].address), chunkFound[index].size, searchValue)
        if(results.length > 0 ){
            foundValuesFinish.push(results[0])
        }
    }
    return foundValuesFinish
}

//this function calculate the 3d distance of two objects
function getDistance3D(x1, y1, z1, x2, y2, z2){
    var dx = x1-x2
    var dy = y1-y2
    var dz = z1-z2
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

//this function calculates the angles between two points
function getAngles(x1,y1, z1, x2, y2, z2){
    var yawX = -(Math.atan2(x2-x1, y2-y1)) / Math.PI * 180 + 180
    var pitchY = (Math.asin((z2-z1) / parseFloat(getDistance3D(x1, y1, z1, x2, y2, z2)))) * 180/Math.PI

    return yawX + " "+ pitchY;
}

//this function receive to values player
function setAimbot(){
    // var Enemy = {
    //     'ptrPtrEnemy01':getPointer(getPointer(nameProcessBaseAddress.add(0x1abf10)).add(0x10)), // base+0x1abf10 => [ptr+0x10]
    //     'ptrPtrEnemy02':getPointer(getPointer(getPointer(getPointer(nameProcessBaseAddress.add(0x1c4498)).add(0x38)).add(0x8)).add(0x70)) //Base + 0x1c4498 => [ptr +0x38] => [ptr + 0x8] => [ptr + 0x70]
    // }
    var distance = []
    var enemyDistance = {}

    try {
        //get distance health and distance for enemy
        for(var enemy in Enemy){
            var enemyPointerHealth = Enemy[enemy].add(player['offsetHealth'])
            var enemyHealth = getIntValueOpcodes(readMemory(enemyPointerHealth, 4))

            if (enemyHealth <= 100){
                var xPosPlayer = readMemoryFloat(pointerPlayer.add(player['xPos']));
                var yPosPlayer = readMemoryFloat(pointerPlayer.add(player['yPos']));
                var zPosPlayer = readMemoryFloat(pointerPlayer.add(player['zPos']));

                var xPosEnemy = readMemoryFloat(Enemy[enemy].add(player['xPos']));
                var yPosEnemy = readMemoryFloat(Enemy[enemy].add(player['yPos']));
                var zPosEnemy = readMemoryFloat(Enemy[enemy].add(player['zPos']));

                var distanceEnemy = parseFloat(getDistance3D(xPosPlayer, yPosPlayer, zPosPlayer, xPosEnemy, yPosEnemy, zPosEnemy))

                if(distanceEnemy){
                    enemyDistance[enemy] = distanceEnemy + "," + xPosEnemy + "," + yPosEnemy + "," + zPosEnemy+ "," + enemyHealth;
                    distance.push(distanceEnemy)
                }


            }
        }
    } catch (error) {}

    console.log(JSON.stringify(enemyDistance))
    var distance = Math.min.apply(Math,distance)

    for(var values in enemyDistance){
        var dataEnemy = enemyDistance[values].split(",")
        if(dataEnemy[0] == distance){
            var result = getAngles(xPosPlayer, yPosPlayer, zPosPlayer, dataEnemy[1], dataEnemy[2], dataEnemy[3]).split(" ")
            var yawX = parseFloat(result[0])
            var pitchY = parseFloat(result[1])

            writeMemoryFloat(pointerPlayer.add(player['xMouse']), yawX)
            writeMemoryFloat(pointerPlayer.add(player['yMouse']), pitchY)
            return "xPos: " + xPosPlayer + " Ypos: " + yPosPlayer + " zPos: " + zPosPlayer + " pitch: "+pitchY + " yaw: " +yawX + " health enemy: " + dataEnemy[4] + " EnemyName: " +readMemoryString(Enemy[values].add(player['offsetPlayerName']))
        }
    }

}

function killingInterceptor(){
        Interceptor.detachAll();
        console.log("[+] turning off monitoring Shot and all Interceptor");
        return true
}
function monitorHealth(){
    var pointerCallFunctionHealth = nameProcessBaseAddress.add(player['ptrOffsetFuncHealth']);
    Interceptor.attach(pointerCallFunctionHealth, {
        onEnter: function(args){
            var pointerHealth = this.context['r12'].add(0x110)
            var pointerPlayer = this.context['r12'];
            var pointerPlayerName = pointerPlayer.add(player['offsetPlayerName']);
            var currentHealth = getIntValueOpcodes(readMemory(pointerHealth, 4));
            var affectation =  parseInt(this.context['r13'],16);
            var currentHealthAfter = currentHealth-affectation

            console.log("[+] identify attack health, pointer player: " + pointerPlayer + 
                        " health before impact: "+ currentHealth +
                        " affectation: "+ affectation + " current health: "+ currentHealthAfter + " player name: " + readMemoryString(pointerPlayerName)
                        )
        }
    });

    return "siiiii"
}

function monitorShot(){
        var pointerCallFunctionShot = nameProcessBaseAddress.add(player['ptrOffsetFuncShooting']);
        Interceptor.attach(pointerCallFunctionShot, {
            onEnter: function(args){
                var pointerPlayer = getPointer(this.context['r13'].add(0x10));
                var pointerPlayerName = pointerPlayer.add(player['offsetPlayerName']);
                console.log("[+] detecting shots, pointer player: " + pointerPlayer + " ammo quantity: " + (getIntValueOpcodes(readMemory(this.context['rax'], 1))-1) + " player name: " +  readMemoryString(pointerPlayerName));
            }
        });
}

function health(cantHealth){
        var pointerHealth = pointerPlayer.add(player['offsetHealth'])
        console.log("[+] Enable increment health, reading and patching bytes in: @" + pointerHealth);
        console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerHealth, 4)));
        writeMemory(pointerHealth, cantHealth)
        console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerHealth, 4)));
}

function machineGun(cantBullet){
    var pointerBulletMachineGun = pointerPlayer.add(player['offsetBulletMachineGun'])
    console.log("[+] Enable increment bullet, reading and patching bytes in: @" + pointerBulletMachineGun);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerBulletMachineGun, 4)));
    writeMemory(pointerBulletMachineGun, cantBullet);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerBulletMachineGun, 4)));
}

function machineGunCharger(cantCharger){
        var pointerBulletMachineGunCharger = pointerPlayer.add(player['offsetBulletMachineGunCharger'])
        console.log("[+] Enable increment bullet, reading and patching bytes in: @" + pointerBulletMachineGunCharger);
        console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerBulletMachineGunCharger, 4)));
        writeMemory(pointerBulletMachineGunCharger, cantCharger);
        console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerBulletMachineGunCharger, 4)));
}

function gun(cantBullet){
    var pointerBulletGun = pointerPlayer.add(player['offsetBulletGun'])
    console.log("[+] Enable increment armor, reading and patching bytes in: @" + pointerBulletGun);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerBulletGun, 4)));
    writeMemory(pointerBulletGun, cantBullet);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerBulletGun, 4)));
}

function gunCharger(cantCharger){
    var pointerBulletGunCharger = pointerPlayer.add(player['offsetBulletGunCharger'])
    console.log("[+] Enable increment armor, reading and patching bytes in: @" + pointerBulletGunCharger);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerBulletGunCharger, 4)));
    writeMemory(pointerBulletGunCharger, cantCharger);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerBulletGunCharger, 4)));
}

function sniper(cantBullet){
    var pointerBulletSniper = pointerPlayer.add(player['offsetBulletSniper'])
    console.log("[+] Enable increment bullet, reading and patching bytes in: @" + pointerBulletSniper);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerBulletSniper, 4)));
    writeMemory(pointerBulletSniper, cantBullet);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerBulletSniper, 4)));
}

function sniperCharger(cantCharger){
    var pointerBulletSniperCharger = pointerPlayer.add(player['offsetBulletSniperCharger'])
    console.log("[+] Enable increment bullet, reading and patching bytes in: @" + pointerBulletSniperCharger);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerBulletSniperCharger, 4)));
    writeMemory(pointerBulletSniperCharger, cantCharger);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerBulletSniperCharger, 4)));
}

function armor(cantArmor){
    var pointerArmor = pointerPlayer.add(player['offsetArmor'])
    console.log("[+] Enable increment grenades, reading and patching bytes in: @" + pointerArmor);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerArmor, 4)));
    writeMemory(pointerArmor, cantArmor);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerArmor, 4)));
}

function grenade(cantGrenade){
    var pointerGrenade = pointerPlayer.add(player['offsetGrenade'])
    console.log("[+] Enable increment grenades, reading and patching bytes in: @" + pointerGrenade);
    console.log('[+] current value: '+ getIntValueOpcodes(readMemory(pointerGrenade, 4)));
    writeMemory(pointerGrenade, cantGrenade);
    console.log('[+] new value: '+ getIntValueOpcodes(readMemory(pointerGrenade, 4)));
}



rpc.exports = {
    readMemory: readMemory,
    readMemoryString: readMemoryString,
    writeMemory: writeMemory,
    readMemoryFloat: readMemoryFloat,
    writeMemoryFloat: writeMemoryFloat,
    scanHeap: scanHeap,
    searchMemory: searchMemory,
    setAimbot: setAimbot,
    monitorHealth:monitorHealth,
    monitorShot:monitorShot,
    health:health,
    machineGun:machineGun,
    machineGunCharger:machineGunCharger,
    gun:gun,
    gunCharger:gunCharger,
    sniper:sniper,
    sniperCharger:sniperCharger,
    armor:armor,
    grenade:grenade,
    killingInterceptor:killingInterceptor,
    getPlayerShot:getPlayerShot
}

