/*
CREDITS:
https://github.com/MikeMcl/bignumber.js - BigNumber.js library
http://www.webtoolkit.info/ - Base64 encoding and decoding

Main development - Pruper
Repository: https://github.com/Pruper/voidedidle
*/

let shifted = false;

let game = {
    userdata: {
        // Currencies
        coins: new BigNumber('0'),
        lifetimeCoins: new BigNumber('0'),
        diamondCoins: new BigNumber('0'),
        lifetimeDiamondCoins: new BigNumber('0'),
        // Upgrade values
        cpc: new BigNumber('1'),
        cps: new BigNumber('0'),
        // Generated
        characters: []
    },

    setup() {
        for (let i = 0; i < staticdata.characters.length; i++) {
            game.userdata.characters[i] = { id: i, diamondLevels: 0, level: 0 };
        }

        game.userdata.cpc = events.characters.getTotalCoinsPerClick();
        game.userdata.cps = events.characters.getTotalCoinsPerSecond();
    }
}


// Event functions
let events = {
    bigCoinClick() {
        this.addCoins(game.userdata.cpc);
    },

    addCoins(amount) {
        game.userdata.coins = game.userdata.coins.plus(new BigNumber(amount));
        game.userdata.lifetimeCoins = game.userdata.lifetimeCoins.plus(new BigNumber(amount));
        graphics.updateCoins();
    },

    removeCoins(amount) {
        game.userdata.coins = game.userdata.coins.minus(new BigNumber(amount));
        graphics.updateCoins();
    },

    addDiamondCoins(amount) {
        game.userdata.diamondCoins = game.userdata.diamondCoins.plus(new BigNumber(amount));
        game.userdata.lifetimeDiamondCoins = game.userdata.lifetimeDiamondCoins.plus(new BigNumber(amount));
        graphics.updateCoins();
    },

    removeDiamondCoins(amount) {
        game.userdata.diamondCoins = game.userdata.diamondCoins.minus(new BigNumber(amount));
        graphics.updateCoins();
    },

    characters: {
        purchaseCharacterUpgrade(index) {
            let upgradeAmount = shifted ? 10 : 1;

            for (i = 0; i < upgradeAmount; i++) {
                if (game.userdata.coins.isGreaterThanOrEqualTo(this.getCharacterCost(index))) {
                    events.removeCoins(this.getCharacterCost(index));
                    game.userdata.characters[index].level++;
                }
                game.userdata.cpc = events.characters.getTotalCoinsPerClick();
                game.userdata.cps = events.characters.getTotalCoinsPerSecond();

                graphics.updateCoins();
                graphics.updateCharacter(index);
            }
        },

        getCharacterCost(index) {
            let baseCost = new BigNumber(staticdata.characters[index].cost);
            let currentCost = new BigNumber(1.05).exponentiatedBy(game.userdata.characters[index].level).multipliedBy(baseCost).integerValue(BigNumber.ROUND_FLOOR);
            return currentCost;
            // change 0 to character level
        },

        getTotalCoinsPerClick() {
            let base = new BigNumber(1);
            for (let i = 0; i < game.userdata.characters.length; i++) {
                base = base.plus(this.getCoinsPerClick(i));
            }

            return base;
        },

        getTotalCoinsPerSecond() {
            let base = new BigNumber(0);
            for (let i = 0; i < game.userdata.characters.length; i++) {
                base = base.plus(this.getCoinsPerSecond(i));
            }

            return base;
        },

        getCoinsPerClick(index) {
            return new BigNumber(staticdata.characters[index].perClick).multipliedBy(game.userdata.characters[index].level).multipliedBy(this.getLevelBoost(index)).multipliedBy(game.userdata.characters[index].diamondLevels + 1);
        },

        getCoinsPerSecond(index) {
            return new BigNumber(staticdata.characters[index].perSecond).multipliedBy(game.userdata.characters[index].level).multipliedBy(this.getLevelBoost(index).multipliedBy(game.userdata.characters[index].diamondLevels + 1));
        },

        getLevelBoost(index) {
            let amount = game.userdata.characters[index].level;
            return new BigNumber(9).exponentiatedBy(Math.max(0, Math.floor(amount / 50) - 2));
        },

        getPreviousBoostLevel(index) {
            let amount = game.userdata.characters[index].level;
            if (amount < 150) return 0;
            return Math.floor(amount / 50) * 50;
        },

        getNextBoostLevel(index) {
            let amount = game.userdata.characters[index].level;
            if (amount < 150) return 150;
            return (Math.floor(amount / 50) * 50) + 50;
        },

        getDiamondCoinsFromCharacters() {
            let base = 0;
            for (let i = 0; i < game.userdata.characters.length; i++) {
                base += this.getDiamondCoinsFromCharacter(i);
            }

            return base;
        },

        getDiamondCoinsFromCharacter(index) {
            let amount = game.userdata.characters[index].level;
            return Math.max(0, Math.floor(amount / 50) - 2);
        }
    },

    prestige: {
        confirm() {
            popup.display(`<h1>Do you want to prestige?</h1><p>Your game will restart, but you will get the following bonuses:</p><h1><span id="diamondCoinDisplay">${utility.number.format(events.characters.getDiamondCoinsFromCharacters())}</span> <dcoin></dcoin></h1><h1><span style=\"color:DarkSlateBlue;\">+${events.characters.getDiamondCoinsFromCharacters()}x Diamond Multiplier (Random Character)</span></h1>`, "PRESTIGE", "events.prestige.prestige();");
        },

        prestige() {
            let characterDiamondCoins = events.characters.getDiamondCoinsFromCharacters();

            // Diamond roll
            let rollPossibilities = [];
            let diamondRoll = -1;
            for (i = 0; i < game.userdata.characters.length; i++) {
                if (game.userdata.characters[i].level > 0) rollPossibilities.push(i);
            }
            if (rollPossibilities.length > 0) {
                diamondRoll = rollPossibilities[Math.floor(Math.random() * rollPossibilities.length)];
            } else {
                diamondRoll = Math.floor(Math.random() * game.userdata.characters.length);
            }

            let oldDiamond = game.userdata.characters[diamondRoll].diamondLevels;
            let newDiamond = oldDiamond + characterDiamondCoins;

            events.addDiamondCoins(new BigNumber(characterDiamondCoins));
            
            // Reset coins and characters
            game.userdata.coins = new BigNumber(0);
            for (let i = 0; i < game.userdata.characters.length; i++) {
                game.userdata.characters[i].level = 0;
                if (i == diamondRoll) game.userdata.characters[i].diamondLevels += characterDiamondCoins;
            }

            game.userdata.cpc = events.characters.getTotalCoinsPerClick();
            game.userdata.cps = events.characters.getTotalCoinsPerSecond();

            // Reward screen
            popup.hide();
            popup.display(`<h1>Prestige Complete!</h1><img height=128px width=128px src="${utility.getCharacterImage(diamondRoll)}"><p><b>${staticdata.characters[diamondRoll].name} </b>received Diamond Upgrade!</p><h1><h1><span style=\"color:DarkSlateBlue;\">${oldDiamond}x → ${newDiamond}x</span></h1>`, "OK");

            graphics.updateAll();
        }
    }
}

// Graphics
let graphics = {
    loadInitial() {
        let characterElement = document.getElementById("characters")
        for (let i = 0; i < staticdata.characters.length; i++) {
            characterElement.innerHTML += utility.generateCharacterBaseHtml(i);
        }

        this.updateAll();
    },

    updateAll() {
        this.updateCoins();
        this.updateAllCharacters();
        this.updateTooltip();
    },

    updateCoins() {
        document.getElementById("coinDisplay").innerHTML = utility.number.format(game.userdata.coins);
        document.getElementById("diamondCoinDisplay").innerHTML = utility.number.format(game.userdata.diamondCoins);

        document.getElementById("cpcDisplay").innerHTML = utility.number.format(game.userdata.cpc);
        document.getElementById("cpsDisplay").innerHTML = utility.number.format(game.userdata.cps);
    },

    updateAllCharacters() {
        for (i = 0; i < staticdata.characters.length; i++) {
            this.updateCharacter(staticdata.characters[i].id);
        }
    },

    updateCharacter(index) {
        let chardata = staticdata.characters[index];
        let amount = game.userdata.characters[index].level;
        let diamondLevels = game.userdata.characters[index].diamondLevels;

        if (diamondLevels > 0) {
            document.getElementById("char_" + chardata.id).classList.add("diamond");
        } else {
            document.getElementById("char_" + chardata.id).classList.remove("diamond");
        }
        document.getElementById("char_" + chardata.id + "_info").innerHTML = `${chardata.name}<br><br>Level ${amount}${events.characters.getCoinsPerSecond(index).isGreaterThan(0) ? "<br><br>Per Second: " + utility.number.format(events.characters.getCoinsPerSecond(index)) : ""}${events.characters.getCoinsPerClick(index).isGreaterThan(0) ? "<br><br>Per Click: " + utility.number.format(events.characters.getCoinsPerClick(index)) : ""}`;
        document.getElementById("char_" + chardata.id + "_button").innerHTML = `${game.userdata.characters[index].level > 0 ? "UPGRADE" : "PURCHASE"}<br><coin></coin> ${utility.number.format(events.characters.getCharacterCost(index))}`;
        document.getElementById("char_" + chardata.id + "_boostDisplay").innerHTML = `${diamondLevels > 0 ? "<span style=\"color:DarkSlateBlue;\">Diamond Buff: +" + (diamondLevels) + "x</span><br><br>" : ""}Boost at Level ${events.characters.getNextBoostLevel(index)} + <dcoin></dcoin>`;
        document.getElementById("char_" + chardata.id + "_bar").style.width = `${utility.calculatePercentOf(amount - events.characters.getPreviousBoostLevel(index), events.characters.getNextBoostLevel(index) - events.characters.getPreviousBoostLevel(index))}%`;
    },

    updateTooltip() {
        if (tooltip.visible == false) {
            document.getElementById("tooltip_anchor").style.display = "none";
        } else {
            document.getElementById("tooltip_anchor").style.display = "block";
        }
    }
}

let utility = {
    calculatePercentOf: function (firstNumber, secondNumber) {
        let a = BigNumber(firstNumber);
        let b = BigNumber(secondNumber);
        let c = a.dividedBy(b);
        let d = c.multipliedBy('100');
        return d.toNumber();
    },

    randomChanceGenerator: function (chance, max) {
        let roll = Math.random() * max
        return roll <= chance
    },

    number: {
        format: function (numberParam) {
            number = BigNumber(numberParam)
            if (number.isGreaterThanOrEqualTo('1.0e66')) {
                return number.toExponential(3, 1).replace('+', '');
            } else if (number.isLessThan('1000')) {
                return number.integerValue(1).toNumber().toString();
            } else {
                let symbols = ["", "K", "M", "B", "T", "q", "Q", "s", "S", "O", "N", "d", "U", "D", "!", "@", "#", "$", "%", "^", "&", "*"]
                let sym = Math.floor(number.e / 3);
                let tenPower = BigNumber(10).exponentiatedBy(Math.floor(number.e / 3) * 3)

                var outputValue = (number.dividedBy(tenPower).toNumber() - 0.0044).toFixed(2);
                var returnString = outputValue + "" + symbols[sym]

                return returnString;
            }
        },

        formatScientific: function (numberParam, decimals = false) {
            number = BigNumber(numberParam);
            if (number.isGreaterThanOrEqualTo('100000')) {
                return number.toExponential(3, 1).replace('+', '');
            } else {
                if (decimals == false) number = number.integerValue(1);
                if (decimals == true) number = number.multipliedBy('100').integerValue(1).dividedBy('100');
                return number.toNumber().toString();
            }
        }
    },

    romanNumeral: function (number) {
        // Efficient roman numeral generator by broman

        if (number >= 10000) return number;
        var numeral = ''
        var numeralList = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        var decimalList = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];

        for (i in decimalList) {
            while (number >= decimalList[i]) {
                number -= decimalList[i];
                numeral += numeralList[i];
            }
        }
        return numeral;
    },

    generateCharacterBaseHtml(index) {
        let chardata = staticdata.characters[index];
        let prefix = "char_" + chardata.id;

        let divId = prefix;
        let charInfoId = prefix + "_info";
        let buttonId = prefix + "_button";
        let boostId = prefix + "_boostDisplay"
        let barId = prefix + "_bar";

        return `<div id="${divId}" class="charUpgrade"><table><td style="width:20%;"><img height=128px width=128px src="${this.getCharacterImage(index)}"></td><td id="${charInfoId}" style="width:35%;"></td><td style="width:40%;"><p id="${boostId}"></p><br><div class="progressHolder"><div id="${barId}" class="progress" style="width:50%;"></div></div></td><button id="${buttonId}" style=\"float:right;\" class=\"upgradeButton\" onmouseenter="tooltip.showText('<b>${chardata.name}</b><br><br>Shift click to attempt to level up 10 times!');" onmouseleave="tooltip.hide();" onclick="events.characters.purchaseCharacterUpgrade(${index})"></button></table></div>`;

        // "<div id=\"" + divId + "\" class=\"charUpgrade\"><table><td><img style=\"margin-right:20px;\" height=128px width=128px src=\"assets/images/characters/" + char.icon + "\"></image></td><td style=\"width:260px;\"><p id=\"" + divName + "\"><p id=\"" + divLevel + "\"></p><p id=\"" + divDPS + "\"></p></td><td><p id=\"" + divUpgrades + "\" style=\"font-size:15px;font-weight:normal;\"></p></td><button id=\"" + divButton + "\" " + buttonMouseControl + " onclick=\"events.characters.purchase(" + i + ")\" style=\"float:right;\" class=\"upgradeButton\"></button></table></div>";
    },

    getCharacterImage(index) {
        let chardata = staticdata.characters[index];
        if (chardata.image == "FROM_NAME") {
            return `https://cravatar.eu/helmhead/${chardata.name}/600.png`;
        }
        return chardata.image;
    }
}

const SAVE_VERSION = 1;
const SAVE_VERSION_TEXT = '0.1.0';
document.getElementById("version").innerHTML = "Playing <b>Voided Idle</b> version " + SAVE_VERSION_TEXT + "<br>Developed by Pruper";
const BETA_STATUS = false;
const BIGNUMBER_VALUES = ["coins", "lifetimeCoins", "diamondCoins", "lifetimeDiamondCoins"];

let save = {
    save: {},

    getSave: function () {
        this.save = game.userdata;
        this.save.version = SAVE_VERSION;
        this.save.timestamp = Date.now();

        // IS BETA?
        this.save.isBeta = BETA_STATUS;
        return Base64.encode(JSON.stringify(save.save))
    },

    manualSaveGame: function (es) {
        let element = document.createElement('a');
        element.style.display = 'none';
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(es));
        element.setAttribute('download', "voidedsky_idle_save.txt");
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },

    autoSaveGame: function (es) {
        window.localStorage.setItem('vsi_save', es);
    },

    wipeAutoSave: function () {
        window.localStorage.removeItem('vsi_save');
        location.reload();
    },

    loadGame: function () {
        if (save.save.isBeta != BETA_STATUS) {
            display.popup.display("This save is a beta save and cannot be imported into the live version! Please import a save file from a different, non beta build. Thank you!", "OK", "CLOSE");
        } else {
            let sd = this.save;

            game.userdata = {
                ...game.userdata,
                ...sd,
            }

            /* game.userdata.settings = {
                ...game.userData.settings,
                ...sd.settings,
            } */

            // BigNumber stats
            for (i = 0; i < BIGNUMBER_VALUES.length; i++) {
                game.userdata[BIGNUMBER_VALUES[i]] = new BigNumber(game.userdata[BIGNUMBER_VALUES[i]]);
            }


            // characters
            for (i = 0; i < staticdata.characters.length; i++) {
                if (typeof sd.characters[i].id != "undefined") game.userdata.characters[i].id = sd.characters[i].id;
                if (typeof sd.characters[i].level != "undefined") game.userdata.characters[i].level = sd.characters[i].level;
            }

            // offline time
            game.userdata.cpc = events.characters.getTotalCoinsPerClick();
            game.userdata.cps = events.characters.getTotalCoinsPerSecond();

            let currentTimestamp = Date.now();
            let saveTimestamp = this.save.timestamp;
            let offlineCoins = new BigNumber(game.userdata.cps.multipliedBy(((currentTimestamp - saveTimestamp) / 1000)));

            events.addCoins(offlineCoins);
            popup.display(`<h1>Welcome back!</h1><p>While you were away, you collected <coin></coin> <b>${utility.number.format(offlineCoins)}</b>`, "OK");

            graphics.updateAll();
        }
    }
}

let tooltip = {
    visible: false,

    show: function () {
        this.visible = true;
    },

    hide: function () {
        this.visible = false;
    },

    showText: function (html) {
        document.getElementById("tooltip_content").innerHTML = html;
        this.show();
    }
}

let popup = {
    show: function () {
        document.querySelector('.popup-background').style.display = 'flex';
    },

    hide: function () {
        document.querySelector('.popup-background').style.display = 'none';
    },

    display: function (mainText, buttonText, buttonOnClickFunction = "CLOSE") {

        const CLOSE_ID = "CLOSE";
        if (buttonOnClickFunction == CLOSE_ID) buttonOnClickFunction = "popup.hide()";
        document.getElementById("popup-text").innerHTML = mainText;
        document.getElementById("popup-button").innerHTML = "<b>" + buttonText + "</b>";
        document.getElementById("popup-button").setAttribute("onClick", "javascript: " + buttonOnClickFunction + ";");
        popup.show();
    }
}

document.addEventListener('keyup', handleShiftKey);
document.addEventListener('keydown', handleShiftKey);

function handleShiftKey(e) {
    shifted = e.shiftKey;
}

document.addEventListener('mousemove', function(e) {
    graphics.updateTooltip();

    let tooltip = document.getElementById('tooltip_main');
    tooltip.style.left = (e.pageX - 200) + 'px';
    tooltip.style.top = (e.pageY - (tooltip.offsetHeight - 80)) + 'px';
});

// Stop annoying right click thing
document.addEventListener('contextmenu', event => event.preventDefault());

game.setup();
graphics.loadInitial();

//
// Load from storage
//
const input = document.querySelector('input[type="file"]')
input.addEventListener('change', function (e) {
    const reader = new FileReader();
    reader.onload = function () {
        let readText = reader.result;
        save.save = JSON.parse(Base64.decode(readText));
        save.loadGame();
    }
    reader.readAsText(input.files[0]);
});

//////////////////////////
/// LOCAL STORAGE LOAD ///
//////////////////////////
if (window.localStorage.getItem('vsi_save') != null) {
    let readText = window.localStorage.getItem('vsi_save');
    save.save = JSON.parse(Base64.decode(readText));
    save.loadGame();

    console.log("Successfully loaded save from HTML5 local storage!")
}
//////////////////////////
// END OF LOCAL STORAGE //
//////////////////////////

setInterval(function () {
    events.addCoins(game.userdata.cps.dividedBy(50))
}, 1000 / 50);

// autosave
setInterval(function () {
    save.autoSaveGame(save.getSave());
}, 15000)