Module.register(function() {

	var MODULE_NAME = 'gui_enhancement';
	var OKGIF = chrome.extension.getURL("images/ok.png");
	var NOKGIF = chrome.extension.getURL("images/nok.png");
	var CAUTIONGIF = chrome.extension.getURL("images/caution.png");

	/******************
	 * Module context *
	 ******************/

	/**
	 * Add the i18n strings for this module.
	 */
	function add_i18n()
	{
		var i18n = {};

		i18n[I18N.LANG.FR] = {};
		i18n[I18N.LANG.FR][MODULE_NAME + '_short_desc'] = 'Améliorations de l\'interface';
		i18n[I18N.LANG.FR][MODULE_NAME + '_full_desc'] = 'Modifie l\'interface de Hordes pour améliorer certains aspects du jeu.';
		i18n[I18N.LANG.FR][MODULE_NAME + '_ok_save'] = 'Peut être sauvé.';
		i18n[I18N.LANG.FR][MODULE_NAME + '_nok_save'] = 'Ne peut pas être sauvé.';
		i18n[I18N.LANG.FR][MODULE_NAME + '_ok_escort'] = 'Escorte bien paramétrée.';
		i18n[I18N.LANG.FR][MODULE_NAME + '_nok_escort'] = 'Escorte mal paramétrée.';
		i18n[I18N.LANG.FR][MODULE_NAME + '_distance_text'] = 'Le citoyen est à $[1] km.';

		i18n[I18N.LANG.EN] = {};
		i18n[I18N.LANG.EN][MODULE_NAME + '_short_desc'] = 'GUI enhancement';
		i18n[I18N.LANG.EN][MODULE_NAME + '_full_desc'] = 'Add some graphical enhancements to the general UI of Die2Nite.';
		i18n[I18N.LANG.EN][MODULE_NAME + '_ok_save'] = 'Can be saved.';
		i18n[I18N.LANG.EN][MODULE_NAME + '_nok_save'] = 'Cannot be saved.';
		i18n[I18N.LANG.EN][MODULE_NAME + '_ok_escort'] = 'Good escort options set.';
		i18n[I18N.LANG.EN][MODULE_NAME + '_nok_escort'] = 'Good escort options not set.';
		i18n[I18N.LANG.EN][MODULE_NAME + '_distance_text'] = 'The citizen is $[1] km away.';

		I18N.set(i18n);
	}

	/**
	 * Add icon if citizen is outside and beyong reach (for the hero action "Rescue")
	 */
	function enhance_citizen_interface(){
		if($("div.heroMode").length){
			// If we're a hero, shows a green or red sign if the citizen can be rescued
			JS.wait_for_selector('div.citizens table', function(el) {
				var citizensRows = el.querySelectorAll("tr");
				for(var i = 1 ; i < citizensRows.length ; i++){
					var row = citizensRows[i];
					// No coordinates columns (dead citizen)
					if(row.children[4] === undefined) continue;
					
					// Get the citizen's location, and if it's "--", then he is in town
					var location = row.children[4].innerText;
					if(location.trim() === "--") continue;

					// Here, the citizen is outside
					// It's time to see if he is farther than 11km (for the Rescue)
					/* jshint ignore:start */
					var coordinates = eval(location);
					/* jshint ignore:end */
					var distance = getDistance(0, 0, coordinates[0], coordinates[1]);

					var imgSauvetage = null;
					if($("#infosSaving" + i).length === 0){
						imgSauvetage = $("<img>");
						imgSauvetage.attr("id", "infosSaving" + i);
					} else {
						imgSauvetage = $("#infosSaving" + i);
					}

					imgSauvetage.attr("onmouseover", "js.HordeTip.showSpecialTip(this, 'helpTip', '', " + JSON.stringify(I18N.get(MODULE_NAME + '_distance_text').replace("$[1]", distance)) + ", event);");
					imgSauvetage.attr("onomuseout", "js.HordeTip.hide(event);");

					if(distance > 2) {
						imgSauvetage.attr("src", NOKGIF);
						imgSauvetage.attr("alt", I18N.get(MODULE_NAME + '_nok_save'));

					} else {
						imgSauvetage.attr("src", OKGIF);
						imgSauvetage.attr("alt", I18N.get(MODULE_NAME + '_ok_save'));
					}

					if($("#infosSaving" + i).length === 0){
						$(row.children[4].children[0]).append("&nbsp;");
						$(row.children[4].children[0]).append(imgSauvetage);
					}
				}
			});
		}
	}

	function getDistance(x1,y1,x2,y2) {
		var a = x1 - x2;
		var b = y1 - y2;

		var c = Math.sqrt(a * a + b * b);
		return Math.round(c);
	}

	/**
	 * Add icon to quickly see if a citizen escorted has the good escort options
	 */
	function enhance_outside_interface(){

		JS.wait_for_selector('div.who table', function(el) {

			$(el).css("width", "350px");
			var citizensRows = el.querySelectorAll("tr");
			
			// We go 2 by 2 because between each citizen row, there is a useless hidden row...
			for(var i = 1 ; i < citizensRows.length ; i += 2){
				var citizenRow = citizensRows[i];
				var actions = citizenRow.children[2];

				// If there is no actions possibles, it may be possible that the row is the player himself
				if(actions === undefined || actions === null || actions.innerHTML.trim() === "&nbsp;") continue;

				var escortInfosBtn = actions.querySelector('a img[src^="/gfx/icons/small_more.gif"]');

				var imgEscort = document.createElement("img");
				imgEscort.setAttribute("id", "infoEscort" + i);

				// We cannot know if the good escort options are set
				if(escortInfosBtn === null)
					continue;

				var escortRow = citizensRows[i+1];

				// We move the "Stop escort" button
				var stopEscort = escortRow.querySelector("a[href^='#user/stopEscort']");
				stopEscort.setAttribute("class", "uact");
				$(stopEscort).insertBefore($(escortInfosBtn.parentNode.parentNode));
				$('<span>').html("&nbsp;").insertBefore($(escortInfosBtn.parentNode.parentNode));

				// We move the "Search Ground" button
				var searchGround = escortRow.querySelector("a[href^='#outside/remoteSearchGround']");
				searchGround.setAttribute("class", "uact");
				$(searchGround).insertBefore($(escortInfosBtn.parentNode.parentNode));
				$('<span>').html("&nbsp;").insertBefore($(escortInfosBtn.parentNode.parentNode));
				
				// If the citizen is already searching the ground, we disable the "search" button (as it is useless)
				var searching = citizenRow.children[1].querySelector("img[src='http://data.hordes.fr/gfx/icons/small_gather.gif']");
				if(searching != null){
					searchGround.setAttribute("class", "uact uactOff off");
					searchGround.setAttribute("href", "#");
					searchGround.setAttribute("onclick", "return false;");
					searchGround.setAttribute("onmouseover", searching.getAttribute("onmouseover"));
				}


				// We get the escort infos
				var escortInfos = escortRow.querySelectorAll("div.extraInfos p");

				if(escortInfos.length > 0){
					imgEscort.setAttribute("src", NOKGIF);
					imgEscort.setAttribute("alt", I18N.get(MODULE_NAME + '_nok_escort'));
					var infos = "<p style='color: red;'>";
					for(var j = 0 ; j < escortInfos.length ; j++){
						infos += escortInfos[j].innerText + "<br />";
					}
					infos += "</p>";

					imgEscort.setAttribute("onmouseover", "js.HordeTip.showSpecialTip(this, 'helpTip', '', " + JSON.stringify(infos) + ", event);");
				} else {
					imgEscort.setAttribute("src", OKGIF);
					imgEscort.setAttribute("alt", I18N.get(MODULE_NAME + '_ok_escort'));
					imgEscort.setAttribute("onmouseover", "js.HordeTip.showSpecialTip(this, 'helpTip', '', " + JSON.stringify(I18N.get(MODULE_NAME + '_ok_escort')) + ", event);");
				}
				imgEscort.setAttribute("onmouseout", "js.HordeTip.hide(event);");

				if(document.getElementById("infoEscort" + i) !== null)
					$("#infoEscort" + i).remove();

				actions.appendChild(imgEscort);

				i++; // to skip the "more" row
			}
		});

		JS.wait_for_selector('#campInfos div.actions', function(el) {
			var actions = el.children;
			for(var i = 0 ; i <= actions.length ; i++){
				$(actions[i]).css("width", "auto");
			}
		});
	}

	/**
	 * Make the citizen's table wider
	 */
	function enhance_doors_interface(){
		JS.wait_for_selector("div.who", function(node){
			$(node).css("width", "300px");
		});
	}

	/**
	 * Make the building table better
	 */
	function enhancement_buildings_interface(){
		JS.wait_for_selector("table.table", function(node){
			JS.injectCSS(".bvote table tr td.reco { background-color: #ff0; color: black;}");
		});

		JS.wait_for_selector(".bvote div.reco", function(node){
			JS.injectCSS(".bvote div.reco { cursor: pointer; }");
			$(node).click(function(){
				var obj = $(".bvote table tr td.reco"); // Objet cible
				var speed = 750; // Durée de l'animation (en ms)
				$('html, body').animate( { scrollTop: $(obj).offset().top - $(window).height() / 2 }, speed ); // Go
				return false;
			});
		});
	}

	/************************
	 * Module configuration *
	 ************************/

	return {

		name: MODULE_NAME,
		type: Module.TYPE.INTERFACE_ENHANCEMENT,

		properties: {
			enabled: false
		},

		configurable: {
			enabled: {
				category: Module.PROPERTY_CATEGORY.GENERAL,
				type: Module.PROPERTY.BOOLEAN,
				short_desc_I18N: MODULE_NAME + '_short_desc',
				full_desc_I18N: MODULE_NAME + '_full_desc'
			}
		},

		actions: {
			can_run: function() {
				return true;
			},

			init: function() {
				add_i18n();
			},

			load: function() {
				document.addEventListener('d2n_gamebody_reload', function() {
					if (D2N.is_on_page_in_city('citizens')) {
						enhance_citizen_interface();
					}

					if (D2N.is_outside()){
						enhance_outside_interface();
					}

					if (D2N.is_outside_at_doors()){
						enhance_doors_interface();
					}

					if(D2N.is_on_page_in_city('buildings')) {
						enhancement_buildings_interface();
					}
				}, false);

				JS.injectCSS(
					".bigBg2 {" +
						"background-attachment: fixed;" + 
					"}" +
					".newFooter {" +
						"background-position: -1px 0;" + 
					"}"
				);

				if($("#tid_bar_down").parents(".bigBg2").length == 0)
					$("#tid_bar_down").appendTo(".bigBg2");
			}
		}
	};
});