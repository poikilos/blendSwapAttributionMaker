// ==UserScript==
// @name         Blend Swap Attribution Maker
// @namespace    http://poikilos.org/
// @version      1.0.6
// @description  Format the information from a content page
// @author       Poikilos (Jake Gustafson)
// @license MIT
// @include      /^https?\:\/\/(www\.)?blendswap\.com\/blend\/.*/
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
  // based on openGameArtAttributionMaker (same author)
  var myName = "Blend Swap Attribution Maker";
  var verbose = true;
/*
    if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}
*/
  var checkTimer = null;
  var dateTagName = "li";
  var submittedDateGrandParentClassName = "sticky-top";
  // var authorAncestorClassName = "field-name-author-submitter"; // this div's children[1].firstChild.firstChild.firstChild is the author element
  var authorAncestorClassName = null; // set to null to not search for it; otherwise requires authorGreatUncleFlag
  var authorGreatUncleFlag = "Author:"; // such as opengameart (this tag's sibling's first grandchild is the author)
  var authorParentTag = "li";
  var authorTag = "a";
  var authorParentFlag = "Creator:";
  var authorClassName = "list-group-item";
  var authorHrefBaseUrl = "https://www.blendswap.com"; // such as for blendswap.com: Creator: <a href="/profile/918677">fatacuciocolata</a>
  var programVersionTag = "li";
  var programVersionFlag = "Blender ";
  var programVersionTerm = "Blender"; // Display this term for the information that was originally after programVersionFlag.
  var mediumTag = "li";
  var mediumFlag = "Render: ";
  var mediumTerm = "Render"; // Display this term for the information that was originally after mediumFlag.
  // blendswap.com:
  /*
  ```
  <li class="list-group-item">
  ```

  then many spaces, "\n", many more spaces, then:

  ```
  Creator: <a href="/profile/918677">fatacuciocolata</a>
  ```

  (there is a newline after "Creator:" too)
  */

  // var madeDivClassName = "username"; // <span class='username'> (may or may not contain <a>)
  var madeSpanClassName = "username"; // <li class="list-group-item"><i class="far fa-user" style="color:#ae3ec9;margin-right: 0.25rem;"></i>Creator: <a href="/profile/918677">fatacuciocolata</a></li>
  // ^ such as in `<span rel="sioc:has_creator"><a href="/users/reeguy" title="View user profile." class="username" xml:lang="" about="/users/reeguy" typeof="sioc:UserAccount" property="foaf:name" datatype="">reeguy</a></span><div class="field field-name-date-joined field-type-ds field-label-hidden"><div class="field-items"><div class="field-item even"><small><em>joined 6 months 2 weeks ago</em></small></div></div></div><div class="field field-name-post-date field-type-ds field-label-hidden"><div class="field-items"><div class="field-item even">02/10/2021 - 12:37</div></div></div>    </div>`
  // ^ where other usernames may appear but the container span rel="sioc:has_creator" is unique.
  //var licenseClauseImgPrefix = "License__img";
  //var licenseAnchorPrefix = "License__link";
  var descriptionTag = "div";
  var descriptionClassName = "card-body blend-description";
  var buttonContainerClassName = "card sticky-top";  // The first card-body says "Must be logged in" in it which may be confuse users (make them think this script is saying that).

  // Find the URL and name such as in `<div class='license-icon'><a href='http://creativecommons.org/publicdomain/zero/1.0/' target='_blank'><img src='https://opengameart.org/sites/default/files/license_images/cc0.png' alt='' title=''><div class='license-name'>CC0`:
  var licenseAContainerClass = "list-group-item";
  var licenseNameClass = "license-name";
  var collaboratorsClassName = null;

  // var titlePrefix = "ThingPage__modelName";
  // var headingCreatedPrefix = "ThingPage__createdBy";
  // var doneDivPrefixes = [titlePrefix, headingCreatedPrefix];
  // var doneDivPrefixes = [madeDivClassName];
  // ^ This is only necessary when the page has lazy loading.
  // var clausesContainerPrefix = "License__ccLicense";
  var tagHrefContains = "/blends/tag/";
  // var doneDivPrefixesMain = [clausesContainerPrefix];
  var doneClasses = [descriptionClassName];
  var blendSwapNames = {
      "CC-BY": "CC BY 4.0",
      "CC-BY-SA": "CC BY-SA 4.0",
      "CC-BY-NC": "CC BY-NC 4.0",
      "CC-BY-NC-SA": "CC BY-NC-SA 4.0",
      "CC-BY-ND": "CC BY-ND 4.0",
      "CC-BY-NC-ND": "CC BY-NC-ND 4.0",
      "CC0": "CC0 1.0",
      "GAL 1.0": "GAL",
  };
  var urlSmallNames = {
    "/by/1.0": "CC BY 1.0",
    "/by/2.0": "CC BY 2.0",
    "/by/2.5": "CC BY 2.5",
    "/by/3.0": "CC BY 3.0",
    "/by/4.0": "CC BY 4.0",
    "/by-sa/1.0": "CC BY-SA 1.0",
    "/by-sa/2.0": "CC BY-SA 2.0",
    "/by-sa/2.5": "CC BY-SA 2.5",
    "/by-sa/3.0": "CC BY-SA 3.0",
    "/by-sa/4.0": "CC BY-SA 4.0",
    "/by-nc/1.0": "CC BY-NC 1.0",
    "/by-nc/2.0": "CC BY-NC 2.0",
    "/by-nc/2.5": "CC BY-NC 2.5",
    "/by-nc/3.0": "CC BY-NC 3.0",
    "/by-nc/4.0": "CC BY-NC 4.0",
    "/by-nc-sa/1.0": "CC BY-NC-SA 1.0",
    "/by-nc-sa/2.0": "CC BY-NC-SA 2.0",
    "/by-nc-sa/2.5": "CC BY-NC-SA 2.5",
    "/by-nc-sa/3.0": "CC BY-NC-SA 3.0",
    "/by-nc-sa/4.0": "CC BY-NC-SA 4.0",
    "/by-nd/1.0": "CC BY-ND 1.0",
    "/by-nd/2.0": "CC BY-ND 2.0",
    "/by-nd/2.5": "CC BY-ND 2.5",
    "/by-nd/3.0": "CC BY-ND 3.0",
    "/by-nd/4.0": "CC BY-ND 4.0",
    "/by-nd-nc/1.0": "CC BY-ND-NC 1.0",
    "/by-nc-nd/2.0": "CC BY-NC-ND 2.0",
    "/by-nc-nd/2.5": "CC BY-NC-ND 2.5",
    "/by-nc-nd/3.0": "CC BY-NC-ND 3.0",
    "/by-nc-nd/4.0": "CC BY-NC-ND 4.0",
    "creativecommons.org/share-your-work/public-domain/cc0": "CC0",
    "creativecommons.org/publicdomain/zero/1.0": "CC0 1.0",
    "https://generalassetlicense.org/GAL/1.0/": "GAL 1.0",  // The version is derived from the URL in at least two instances in this script.
  };
  var bigNames = {
    "CC BY 1.0": "Creative Commons Attribution 1.0 Generic",
    "CC BY 2.0": "Creative Commons Attribution 2.0 Generic",
    "CC BY 2.5": "Creative Commons Attribution 2.5 Generic",
    "CC BY 3.0": "Creative Commons Attribution 3.0 Unported",
    "CC BY 4.0": "Creative Commons Attribution 4.0 International",
    "CC BY-SA 1.0": "Creative Commons Attribution-ShareAlike 1.0 Generic",
    "CC BY-SA 2.0": "Creative Commons Attribution-ShareAlike 2.0 Generic",
    "CC BY-SA 2.5": "Creative Commons Attribution-ShareAlike 2.5 Generic",
    "CC BY-SA 3.0": "Creative Commons Attribution-ShareAlike 3.0 Unported",
    "CC BY-SA 4.0": "Creative Commons Attribution-ShareAlike 4.0 International",
    "CC BY-NC 1.0": "Creative Commons Attribution-NonCommercial 1.0 Generic",
    "CC BY-NC 2.0": "Creative Commons Attribution-NonCommercial 2.0 Generic",
    "CC BY-NC 2.5": "Creative Commons Attribution-NonCommercial 2.5 Generic",
    "CC BY-NC 3.0": "Creative Commons Attribution-NonCommercial 3.0 Unported",
    "CC BY-NC 4.0": "Creative Commons Attribution-NonCommercial 4.0 International",
    "CC BY-NC-SA 1.0": "Creative Commons Attribution-NonCommercial-ShareAlike 1.0 Generic",
    "CC BY-NC-SA 2.0": "Creative Commons Attribution-NonCommercial-ShareAlike 2.0 Generic",
    "CC BY-NC-SA 2.5": "Creative Commons Attribution-NonCommercial-ShareAlike 2.5 Generic",
    "CC BY-NC-SA 3.0": "Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported",
    "CC BY-NC-SA 4.0": "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International",
    "CC BY-ND 1.0": "Creative Commons Attribution-NoDerivs 1.0 Generic",
    "CC BY-ND 2.0": "Creative Commons Attribution-NoDerivs 2.0 Generic",
    "CC BY-ND 2.5": "Creative Commons Attribution-NoDerivs 2.5 Generic",
    "CC BY-ND 3.0": "Creative Commons Attribution-NoDerivs 3.0 Unported",
    "CC BY-ND 4.0": "Creative Commons Attribution-NoDerivatives 4.0 International",
    "CC BY-ND-NC 1.0": "Creative Commons Attribution-NoDerivs-NonCommercial 1.0 Generic",
    "CC BY-NC-ND 2.0": "Creative Commons Attribution-NonCommercial-NoDerivs 2.0 Generic",
    "CC BY-NC-ND 2.5": "Creative Commons Attribution-NonCommercial-NoDerivs 2.5 Generic",
    "CC BY-NC-ND 3.0": "Creative Commons Attribution-NonCommercial-NoDerivs 3.0 Unported",
    "CC BY-NC-ND 4.0": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
    "CC0": "No Rights Reserved",
    "CC0 1.0": "Creative Commons CC0 1.0 Universal",
    "GAL 1.0": "General Asset License Version 1.0",
  };
  function getElementsByTagWhereClassStartsWith(tagName, str) {
    if (verbose) {
      //console.log("");
      console.log("\ngetElementsByTagAndClassName(\""+str+"\")...");
    }
    var els = [];
    var all = document.getElementsByTagName(tagName);
    if (verbose) {
      console.log("- " + all.length + " total...");
    }
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.className == undefined) continue;
      else if (typeof (el.className) != "string") {
        // className type can be svg or path as opposed to string (WARNING:
        // `<i` becomes `<svg` in FontAwesome!!)
        if (verbose) {
          if (tagName != "*") {
              console.log("- WARNING: typeof el.className is " + (typeof (el.className)) + " for tagName " + el.tagName)
          }
        }
      }
      else if (el.className && el.className.startsWith(str)) {
        // ^ or el.classList.includes(str) if not checking startsWith
        els.push(el);
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length + " (" + all.length + " total)");
    }
    return els;
  }
  function getElementsWhereTextContentTrimStartsWith(tagName, str) {
    if (verbose) {
      // console.log("");
      console.log("\ngetElementsWhereTextContentTrimStartsWith(\""+str+"\")...");
    }
    var els = [];
    var all = document.getElementsByTagName(tagName);
    if (verbose) {
      console.log("- " + all.length + " total...");
    }
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.className == undefined) continue;
      else if (typeof (el.className) != "string") {
        // className type can be svg or path as opposed to string (WARNING:
        // `<i` becomes `<svg` in FontAwesome!!)
        if (verbose) {
          if (tagName != "*") {
              console.log("- WARNING: typeof el.className is " + (typeof (el.className)) + " for tagName " + el.tagName)
          }
        }
      }
      else if (el.textContent && el.textContent.trim().startsWith(str)) {
        els.push(el);
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length + " (" + all.length + " total)");
    }
    return els;
  }
  function getElementsWhereClassStartsWith(str) {
    return getElementsByTagWhereClassStartsWith("*", str);
  }
  function getElementsByTagWhereChildHasClass(tagName, className) {
     // This is useful when all fields are the same but contain something different before the textContent.
    if (verbose) {
      //console.log("");
      console.log("\ngetElementsByTagWhereChildHasClass(\""+tagName+"\",\""+className+"\")...");
    }
    var els = [];
    var all = document.getElementsByTagName(tagName);
    if (verbose) {
      console.log("- " + all.length + " total...");
    }
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      var child = el.firstChild;
      if (child == undefined) {
          if (verbose) {
              console.log("  - child is undefined in tagName " + el.tagName + " className " + el.className);
          }
          continue;
      }
      if (child.className == undefined) {
          if (verbose) {
              console.log("  - child.className is undefined for tagName " + child.tagName + " in className " + el.className);
          }
          continue;
      }
      // WARNING: className doesn't work for svg (`<i` becomes `<svg` in FontAwesome!)
      var childClassName = child.className;
      var childClassNames = undefined;
      if (typeof (child.className) != "string") {
        // svg doesn't get className but class can be present:
        childClassName = child.getAttribute("class");
        if (childClassName && (childClassName.length > 0)) {
            childClassNames = childClassName.split(" ");
        }
      }
      else {
        childClassNames = child.classList;
      }
      if (typeof (childClassName) != "string") {
        // var className = document.querySelector("svg").getAttribute("class");  // https://stackoverflow.com/a/24438226/4541104
        if (verbose) {
          if (tagName != "*") {
            console.log("  - WARNING: typeof el.className is " + typeof (child.className) + " for tagName " + child.tagName)
            // Possible outcomes:
            // className type can be svg or path as opposed to string (WARNING:
            // `<i` becomes `<svg` in FontAwesome!!)
            // WARNING: typeof el.className is object for tagName svg
            // WARNING: typeof el.className is undefined for tagName undefined
          }
        }
      }
      else if (childClassNames.includes && childClassNames.includes(className)) { // list (generated by split above)
        els.push(el);
        if (verbose) {
            console.log("  - found " + className + " among " + child.className + " of tagName " + child.tagName + " in tagName " + el.tagName);
        }
      }
      else if (childClassNames.contains && childClassNames.contains(className)) { // classList (generated as part of the DOM)
        els.push(el);
        if (verbose) {
            console.log("  - found " + className + " among " + child.className + " of tagName " + child.tagName + " in tagName " + el.tagName);
        }
      }
      else {
        if (verbose) {
            console.log("  - " + className + " is not among " + child.className + " of tagName " + child.tagName + " in tagName " + el.tagName);
        }
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length + " (" + all.length + " total)");
    }
    return els;
  }

  function getElementsWhere(tagName, attributeName, value) {
    if (verbose) {
      //console.log("");
      console.log("\ngetSubElementsWhere(\""+tagName+"\", \""+attributeName+"\", \""+value+"\")...");
    }
    var els = [];
    var all = document.getElementsByTagName(tagName);
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.getAttribute(attributeName) == value) {
        els.push(el);
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length);
    }
    return els;
  }
  function getDivsWhereClassStartsWith(str) {
    if (verbose) {
      //console.log("");
      console.log("\nFIND getDivsWhereClassStartsWith(\"" + str + "\")...");
    }
    var els = [];
    var all = document.getElementsByTagName("div");
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.className.startsWith(str)) {
        els.push(el);
        // console.log("- FOUND (" + els.length + ")");
      }
      else {
        // console.log("- " + el.className + " does not start with it.");
      }
    }
    if (verbose) {
      // console.log("Div count: " + all.length);
      console.log("- FOUND " + els.length);
    }
    return els;
  }
  function getWhereClassStartsWithIn(el, str) {
    if (el === undefined) {
      console.log("[getWhereClassStartsWithIn] Error: el is undefined.");
      return [];
    }
    if (verbose) {
      //console.log("");
      console.log("\nDETECT getWhereClassStartsWithIn(el, \""+str+"\")...");
      // console.log("  el: " + JSON.stringify(el)); // DON'T do (could be circular)
      console.log("  el.className: "+el.className);
      console.log("  el.childNodes.length:"+el.childNodes.length+"...");
    }
    var els = [];
    var all = el.childNodes;
    for (var i=0, max=all.length; i < max; i++) {
      var thisEl = all[i];
      if (thisEl.className.startsWith(str)) {
        els.push(thisEl);
        // console.log("- FOUND");
      }
      else {
        // console.log("- "+el.className+" does not start with it.");
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length);
      // console.log("- done (div count: " + all.length + ")");
    }
    return els;
  }
  function hasAllDivPrefixes(prefixes) {
    var found = 0;
    for (var i=0, max=prefixes.length; i < max; i++) {
      if (getDivsWhereClassStartsWith(prefixes[i]).length > 0) {
        found++;
      }
    }
    return found >= prefixes.length;
  }
  function hasAllClasses(classNames) {
    var found = 0;
    for (var i=0, max=classNames.length; i < max; i++) {
      if (document.getElementsByClassName(classNames[i]).length > 0) {
        found++;
      }
      else {
        if (verbose) {
          console.error("The className " + classNames[i] + " was not found.")
        }
      }
    }
    return found >= classNames.length;
  }
  function elementHasAllPrefixes(el, prefixes) {
    var found = 0;
    for (var i=0, max=prefixes.length; i < max; i++) {
      if (getWhereClassStartsWithIn(el, prefixes[i]).length > 0) {
        found++;
      }
    }
    return found >= prefixes.length;
  }
  function getImgsWhereClassStartsWith(str) {
    var els = [];
    var all = document.images; // document.getElementsByTagName("img");
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.className.startsWith(str)) {
        els.push(el);
      }
    }
    return els;
  }
  function getAnchorsWhereClassStartsWith(str) {
    if (verbose) {
        console.log("getAnchorsWhereClassStartsWith(\""+str+"\")...")
    }
    var els = [];
    var all = document.getElementsByTagName("a");
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.className.startsWith(str)) {
        els.push(el);
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length);
      // console.log("- done (div count: " + all.length + ")");
    }
    return els;
  }
  function getAnchorsWhereHrefContains(str) {
      // Example: str=field_art_tags_tid= finds <a href="/art-search-advanced?field_art_tags_tid=grass">...
    if (verbose) {
        console.log("getAnchorsWhereHrefContains(\""+str+"\")...")
    }
    var els = [];
    var all = document.getElementsByTagName("a");
    for (var i=0, max=all.length; i < max; i++) {
      var el = all[i];
      if (el.href.includes(str)) {
        els.push(el);
      }
    }
    if (verbose) {
      console.log("- FOUND " + els.length);
      // console.log("- done (div count: " + all.length + ")");
    }
    return els;
  }

  function elementAToMarkdown(element) {
    var ret = null;
    if (element.href) {
      ret = "[" + element.textContent + "](" + element.href + ")";
    }
    else {
      if (verbose) {
        console.warn("- elementAToMarkdown " + element.textContent + " href is blank in elementAToMarkdown: \"" + element.href + "\"")
      }
      ret = element.textContent;
    }
    return ret;
  }

  function getMarkdown(info) {
    if (verbose) {
      //console.log("");
      console.log("\ngetMarkdown...");
    }
    var outputStr = "";
    if (info.title) {
      if (info.titleHref) {
        outputStr += "[" + info.title + "](" + info.titleHref + ")";
      }
      else {
        outputStr += "" + info.title;
      }
      outputStr += "\n";
      if (info.authorE) {
        outputStr += "\nAuthor: " + elementAToMarkdown(info.authorE);
        // + " and <insert contributor's name here>";
        outputStr += "\n";
      }

      if (info.collaboratorElements) {
        outputStr += "\nCollaborators:"
        if (verbose) {
          console.log("Collaborators:");
        }
        var thisAuthorE = null;
        for (var i=0, max=info.collaboratorElements.length; i < max; i++) {
          thisAuthorE = info.collaboratorElements[i];
          if (verbose) {
           console.log(thisAuthorE.textContent, " ", thisAuthorE.href);
          }
          outputStr += "\n- " + elementAToMarkdown(thisAuthorE);
        }
        outputStr += "\n";
      }
      if (info.year) {
        if (info.submittedByE) {
          outputStr += "\n(Submitted by **" + elementAToMarkdown(info.submittedByE) + "**) ";
        }
        else {
          if (verbose) {
            console.warn("info.submittedByE is false"); // Do not try to read textContent or other properties since they don't exist!
          }
          outputStr += "\nPublished: ";
        }
        if (info.month) {
          outputStr += info.month + " ";
          if (info.day) {
            outputStr += info.day + ", "
          }
        }
        outputStr += info.year;
        if (info.hasOwnProperty("time")) {
          outputStr += " " + info.time;
        }
        outputStr += "\n";
      }
    }
    if (info.licenses) {
      outputStr += "\nLicense(s):";
      var licenseE = null;
      var license = null;
      for (i=0, max=info.licenses.length; i < max; i++) {
        licenseE = info.licenses[i];
        license = {};
        license.href = licenseE.href;
        license.shortLicense = licenseE.shortLicense;
        license.textContent = licenseE.longName;
        if (licenseE.shortLicense) {
          license.textContent = licenseE.shortLicense; // Display the short license name if present.
        }
        outputStr += "\n- " + elementAToMarkdown(license);
      }
      outputStr += "\n";
    }
    else {
      outputStr += "\nLICENSE: [insert license name (&URL unless in each content ZIP) from the original here]\n";
    }

    if (programVersionTerm in info) {
      outputStr += "\n" + programVersionTerm + ": " + info[programVersionTerm] + "\n";
    }
    if (mediumTerm in info) {
      outputStr += "\n" + mediumTerm + ": " + info[mediumTerm] + "\n";
    }
    var tagAnchors = getAnchorsWhereHrefContains(tagHrefContains);
    var tai;
    if (tagAnchors.length > 0) {
      outputStr += "\nTags:";
      for (tai = 0; tai < tagAnchors.length; tai++) {
        var tagA = tagAnchors[tai];
        outputStr += "\n- [" + tagA.textContent + "](" + tagA.href + ")";
      }
      outputStr += "\n";
    }
    else {
      console.error("The page had no tags ('a' tags with *"+tagHrefContains+"* href)")
    }

    if (info.attributionNotice) {
      outputStr += "\n\n## " + info.goodAttributionNoticeFlag + "\n" + info.attributionNotice + "\n";
    }

    if (info.description) {
      outputStr += "\nDescription:\n" + info.description + "\n";
    }

    return outputStr;
  }

  function populateCorrespondingLicenseFields(license) {
    var licenseShortStr = "";
    if (!license.longName) {
      if (license.href) {
        for (const [tryUrlEnding, tryShort] of Object.entries(urlSmallNames)) {
          if (license.href.endsWith(tryUrlEnding)) {
            licenseShortStr = tryShort;
            license.shortLicenseStr = tryShort;
            break;
          }
        }
      }
      if (license.shortLicenseStr) {
        for (const [tryShort, tryLong] of Object.entries(bigNames)) {
          if (tryShort == license.shortLicenseStr) {
            license.longName = tryLong;
            break;
          }
        }
      }
      if (!license.longName) {
        license.longName = license.textContent; // Store longName separately so it can be edited without modifying the page!
      }
    }

    if (license && !licenseShortStr && license.longName) {
      var versionIsFound = false;
      var licenseLower = license.textContent.toLowerCase();
      if (license.textContent.startsWith("Creative Commons") || license.textContent.startsWith("CC")) {
        if (license.textContent.startsWith("CC0 1.0") || license.textContent.startsWith("Creative Commons 0 1.0") || license.textContent.startsWith("Creative Commons Zero 1.0")) {
          if (!license.href) {
            license.href = "https://creativecommons.org/publicdomain/zero/1.0/";
          }
          licenseShortStr = "CCO 1.0";
        }
        else if ((license.textContent == "Creative Commons 0") || (license.textContent == "Creative Commons Zero")) {
          licenseShortStr = "CCO";
        }
        else {
          console.log("Looking for license clauses in license name \""+licenseLower+"\"...");
          licenseShortStr = "CC ";
          if (licenseLower.includes("attribution")) {
            licenseShortStr += "BY";
          }
          if (licenseLower.includes("non-commercial") || licenseLower.includes("noncommercial") || licenseLower.includes("non commercial")) {
            licenseShortStr += "-NC";
          }
          if (licenseLower.includes("no derivatives") || licenseLower.includes("noderivs") || licenseLower.includes("no-derivatives") || licenseLower.includes("noderivatives")) {
            licenseShortStr += "-ND";
          }
          if (licenseLower.includes("sharealike") || licenseLower.includes("share-alike") || licenseLower.includes("share alike") ) {
            licenseShortStr += "-SA";
          }

          if (license.textContent.includes("1.0")) {
            licenseShortStr += " 1.0";
            versionIsFound = true;
          }
          else if (license.textContent.includes("2.0")) {
            licenseShortStr += " 2.0";
            versionIsFound = true;
          }
          else if (license.textContent.includes("3.0")) {
            licenseShortStr += " 3.0";
            versionIsFound = true;
          }
          else if (license.textContent.includes("4.0")) {
            licenseShortStr += " 4.0";
            versionIsFound = true;
          }
          else if (license.exactLicenseVersion !== null) {
            licenseShortStr += " " + license.exactLicenseVersion;
            versionIsFound = true;
          }
        }
      }
      console.log("licenseShortStr: " + licenseShortStr);
      if (!license.href) {
        if (verbose) {
          console.log("deriving license href from licenceShortStr \"" + licenseShortStr + "\"...");
        }
        var parts = licenseShortStr.split(" ");
        if (parts.length == 3) {
          var partialHref = null;
          // such as ["CC", "BY-SA", "3.0"]
          if (parts[1] == "BY") {
            partialHref = "http://creativecommons.org/licenses/by/";
          }
          else if (parts[1] == "BY-SA") {
            partialHref = "http://creativecommons.org/licenses/by-sa/";
          }
          else if (parts[1] == "BY-NC-SA") {
            partialHref = "http://creativecommons.org/licenses/by-nc-sa/";
          }
          else if (parts[1] == "BY-NC-ND") {
            partialHref = "http://creativecommons.org/licenses/by-nc-nd/";
          }
          // NOTE: by-nc-nd-sa is NOT a valid license
          if (partialHref != null) {
            license.href = partialHref + parts[2] + "/";
          }
        }
      }
    }
    // NOT an else if: must be sequential (!):
    if (license.href) {
      if (!licenseShortStr) {
        if (verbose) {
          console.log("Generating short license name from URL instead of from clauses...");
        }
        for (var key in urlSmallNames) {
          // Check if the property/key is defined in the object itself, not in parent
          if (urlSmallNames.hasOwnProperty(key)) {
            if (license.href.includes(key)) {
              licenseShortStr = urlSmallNames[key];
              if (verbose) {
                console.log("- got \""+licenseShortStr+"\" from \""+key+"\"")
              }
              break;
            }
          }
        }
      }
      else {
        console.log("* using existing licenseShortStr \""+licenseShortStr+"\"");
      }

      if (!licenseShortStr) {
        console.warn("Warning: The URL \""+license.href+"\" is not recognized (No key in "+myName+"'s urlSmallNames is a partial of the URL), so the long license name could not be generated.");
      }
      else {
        license.shortLicense = licenseShortStr;
        if (!license.textContent) {
          if (verbose) {
            console.log("Generating license longName from URL instead of from clauses...");
          }
          if (bigNames.hasOwnProperty(licenseShortStr)) {
            // ^ The clauses are only in this order for versions above 1.0!
            license.longName = bigNames[licenseShortStr];
            if (verbose) {
              console.log("- got \""+license.longName+"\"");
            }
          }
          else {
            console.warn("Warning: The short license name \""+licenseShortStr+"\" is not recognized (It is not a key in Thing Remix Attribution Maker's bigNames), so the long license name could not be generated.");
          }
        }
      }
    }
    if (!licenseShortStr) {
        if (!license.textContent) {
            console.warn("The license abbreviation cannot be generated because no license text was generated (no license elements were detected).");
        }
        else {
            console.warn("The license abbreviation cannot be generated for an unknown license: " + license.textContent);
        }
    }
  }

  function setClipboardText(text, callbackBtn) {
    var msg = "(ERROR: Your browser API is unknown.)";
    var okMsg = " &#10003;";
    // See https://stackoverflow.com/questions/52177405/clipboard-writetext-doesnt-work-on-mozilla-ie
    if (navigator.clipboard != undefined) { // Chrome
      navigator.clipboard.writeText(text).then(
        function () {
          console.log('Async: Copying to clipboard was successful!');
          callbackBtn.innerHTML += okMsg;
        }, function (err) {
          console.error('Async: Could not copy text: ', err);
          callbackBtn.innerHTML += '<br/> (ERROR: Accessing the clipboard failed.)';
        }
      );
      msg = null;
    }
    else if (window.clipboardData) { // Internet Explorer
      window.clipboardData.setData("Text", text);
      msg = okMsg;
    }
    if (msg != null) {
      callbackBtn.innerHTML += msg;
    }
  }

  function getButtonContainer() {
    // var pageInfoEs = document.getElementsByClassName("item-page-info");
    var pageInfoEs = getElementsWhereClassStartsWith(buttonContainerClassName);
    if (pageInfoEs == null) {
      return null;
    }
    if (pageInfoEs.length < 1) {
      return null;
    }
    return pageInfoEs[0];
  }

  function getInfo() {
    'use strict';
    var info = {};
    // There should only be one.
    // pageInfoE.innerHTML += "<button onclick=\"getRemixLicense()\">Copy Markdown</button>";
    // var licenseTextE = document.getElementsByClassName("license-text");
    // var licenseTextE = getDivsWhereClassStartsWith(clausesContainerPrefix);
    // var pageInfoEs = document.getElementsByClassName("item-page-info");
    // var pageInfoEs = getDivsWhereClassStartsWith(madeDivClassName);
    // console.log("Checking "+madeDivClassName+"* elements: " + JSON.stringify(pageInfoEs));
    // var titleH2ParentElements = getElementsWhere("div", "class", "far fa-blender"); // var headingParts = getDivsWhereClassStartsWith(titlePrefix);
    var titleH2ParentElements = getElementsByTagWhereClassStartsWith("h1", "page-title");
    /* ^ `<i` gets transformed to `<svg` by FontAwesome (!!):
    <div class="col-12">
            <h1 class="page-title">
                <i class="far fa-blender" style="color:#ff922b;margin-right: 0.5rem;"></i> Simple Street



            </h1>
        </div>
    */
    if (titleH2ParentElements.length > 0) {
      // info.title = titleH2ParentElements[0].firstChild.textContent; // "<div ...><h2>Title..."
      var lines = titleH2ParentElements[0].textContent.split("\n");
      if (lines.length > 0) {
        // uh oh, its a nasty multi-line one.
        for (var lI = 0; lI < lines.length; lI++) {
          if (lines[lI].trim().length > 0) {
            info.title = lines[lI].trim();
            break;
          }
        }
      }
      else {
          info.title = titleH2ParentElements[0].textContent.trim();
      }
    }
    else {
      console.warn("The title is missing. There are no divs with a class starting with " + titlePrefix);
    }



    if (authorAncestorClassName) {
      // such as opengameart format
      var authorAndSubmitterDivs = document.getElementsByClassName(authorAncestorClassName);
      var collaboratorElements = [];
      if (authorAndSubmitterDivs.length > 0) {

        if (!authorAndSubmitterDivs[0].children[0].textContent.includes(authorGreatUncleFlag)) {
          console.warn("The first child of div class " + authorAncestorClassName + " should include \"" + authorGreatUncleFlag + "\" but is \"" + authorAndSubmitterDivs[0].children[0].textContent + "\"");
        }
        var authorE = authorAndSubmitterDivs[0].children[1].firstChild.firstChild.firstChild;
        // ^ such as on opengameart: <div class="field field-name-author-submitter field-type-ds field-label-above">
        //             <div class="field-label">Author:&nbsp;</div>
        //             <div class="field-items">              <!--children[1]-->
        //               <div class="field-item even">        <!--.firstChild-->
        //                 <span class='username'>            <!--.firstChild-->
        //                   <a href='http://3tdstudios.com/' target='_blank'>Ron Kapaun</a>
        //                 </span>
        //                 <br/>(Submitted by <strong><a href="/users/hreikin">hreikin</a></strong>)</div></div></div><div class="field field-name-post-date field-type-ds field-label-hidden"><div class="field-items"><div class="field-item even">Thursday, November 6, 2014 - 13:08</div></div></div><div class="field field-name-field-art-type field-type-taxonomy-term-reference field-label-above"><div class="field-label">Art Type:&nbsp;</div><div class="field-items"><div class="field-item even"><a href="/art-search-advanced?field_art_type_tid%5B%5D=10" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">3D Art</a></div></div></div><div class="field field-name-field-art-tags field-type-taxonomy-term-reference field-label-above"><div class="field-label">Tags:&nbsp;</div><div class="field-items"><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=torque" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">torque</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=dae" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">dae</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=furniture" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">furniture</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=bookshelf" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">bookshelf</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=china" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">china</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=hutch" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">hutch</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=cupboard" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">cupboard</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=Desk" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">Desk</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=table" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">table</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=end%20table" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">end table</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=square" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">square</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=workbench" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">workbench</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=prop" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">prop</a></div></div></div><div class="field field-name-field-art-licenses field-type-taxonomy-term-reference field-label-above"><div class="field-label">License(s):&nbsp;</div><div class="field-items"><div class="field-item even"><div class='license-icon'><a href='http://creativecommons.org/publicdomain/zero/1.0/' target='_blank'><img src='https://opengameart.org/sites/default/files/license_images/cc0.png' alt='' title=''><div class='license-name'>CC0</div></a></div></div></div></div><div class="field field-name-collect field-type-ds field-label-above"><div class="field-label">Collections:&nbsp;</div><div class="field-items"><div class="field-item even"><div class='collect-container'><ul><li><a href="/content/3d-packs">3D - Packs</a></li><li><a href="/content/3d-furniture-and-other-interiorexterior-decorables-under-cc0">3D Furniture and other interior/Exterior Decorables under CC0</a></li><li><a href="/content/3d-medieval-fantasy">3D Medieval Fantasy</a></li><li><a href="/content/3d-models">3D Models</a></li><li><a href="/content/3d-stuff-thangs">3D Stuff &amp; thangs</a></li><li><a href="/content/3td-studios-packs">3TD Studios Packs</a></li><li><a href="/content/arce-movens-2">Arce Movens 2</a></li><li><a href="/content/cc0-assets">CC0 Assets</a></li><li><a href="/content/cc0-assets-3d-low-poly">CC0 ASSETS 3D LOW POLY</a></li><li><a href="/content/cc0-furniture">CC0 Furniture</a></li><li><a href="/content/cco-3d-furniture">CCO 3D Furniture</a></li><li><a href="/content/dead-welcoming">Dead Welcoming</a></li><li><a href="/content/deco">Deco</a></li><li><a href="/content/freerpg-project-assets">FreeRPG Project Assets</a></li><li><a href="/content/game-project-models">Game Project Models</a></li><li><a href="/content/hq-items-interior">HQ Items Interior</a></li><li><a href="/content/legend-of-rathnor-parts">Legend of Rathnor Parts</a></li><li><a href="/content/low-poly-1">low poly</a></li><li><a href="/content/lr">LR</a></li><li><a href="/content/mysterious-sprites-and-housemansion-parts">Mysterious Sprites and House/Mansion Parts</a></li><li><a href="/content/openmw-showcase-possibilities">OpenMW showcase possibilities</a></li><li><a href="/content/torque3d-possible-modelstextures">Torque3D possible models/textures</a></li><li><a href="/content/turodas">Turodas</a></li></ul></div></div></div></div><div class="field field-name-favorites field-type-ds field-label-inline clearfix"><div class="field-label">Favorites:&nbsp;</div><div class="field-items"><div class="field-item even">23</div></div></div><div class="field field-name-flag-favorite field-type-ds field-label-hidden"><div class="field-items"><div class="field-item even"><span class="flag-wrapper flag-favorites flag-favorites-30816">
        // collaboratorElements.push(authorE);
        if (authorAndSubmitterDivs[0].children[1].firstChild.children[2]) {
          var textAfterBRNode = authorAndSubmitterDivs[0].children[1].firstChild.childNodes[2];
          // ^ INFO: authorAndSubmitterDivs[0].children[1].firstChild.children[1].textContent is "" because a <br/> doesn't have textContent.
          if (verbose) {
            // console.log("author + opener for submitter: " + authorAndSubmitterDivs[0].children[1].firstChild.textContent);
            console.log("A submitter opener was found: \"" + textAfterBRNode.textContent + "\"");
          }
          if (textAfterBRNode.textContent.includes("Submitted by")) {
            var submittedByE = authorAndSubmitterDivs[0].children[1].firstChild.children[2].firstChild; // children[1] is field-items . firstChild is field-item even . children[2] is <strong> . firstChild is <a ...>
            if (verbose) {
              console.log("Submitted by:", submittedByE.textContent, "href=" + submittedByE.href)
            }
            info.submittedByE = submittedByE;
          }
          else {
            if (verbose) {
              console.log("There is no \"Submitted by\" in the", authorAncestorClassName, "children[1].firstChild.children[2]")
            }
          }
        }
        if (verbose) {
          console.log("author: " + authorE.textContent, "href:", authorE.href);
        }
        // console.warn("Multiple authors (collaboratorElements) is not yet implemented.");
        info.authorE = authorE;
      }
      else {
        console.warn("The author is missing. There are no divs with a class " + authorAncestorClassName + " having a great grandchild of the second child");
      }
    }
    else {
      // such as blendswap.com format
      var authorParents = getElementsWhereTextContentTrimStartsWith(authorParentTag, authorParentFlag);
      for (var parentI=0, parentMax=authorParents.length; parentI < parentMax; parentI++) {
        var authorParentE = authorParents[parentI];
        for (var authorI=0, authorMax=authorParentE.children.length; authorI < authorMax; authorI++) {
          if (authorParentE.children[authorI].tagName.toLowerCase() == authorTag.toLowerCase()) {
            // var authorStr = authorParentE.children[authorI].textContent.trim().substring(authorParentFlag.length).trim();
            info.authorE = authorParentE.children[authorI];
            // info.authorE.textContent = authorStr;
            break;
          }
        }
        if (verbose) console.log(authorParentFlag + info.authorE.textContent);
      }
    }
      var mediumTag = "li";
      var mediumFlag = "Render: ";
      var mediumTerm = "Render"; // Display this term for the information that was originally after mediumFlag.
    if (programVersionTag && programVersionFlag) {
      var programEls = getElementsWhereTextContentTrimStartsWith(programVersionTag, programVersionFlag);
      if (programEls && (programEls.length > 0)) {
        info[programVersionTerm] = programEls[0].textContent.trim().substring(programVersionFlag.length).trim();
      }
      if (programEls.length > 1) {
        console.warn("WARNING: There were more than one "+programVersionTerm+" elements ("+programVersionTag+" containing \""+programVersionFlag+"\"");
      }
    }
    if (mediumTag && mediumFlag) {
      var mediumEls = getElementsWhereTextContentTrimStartsWith(mediumTag, mediumFlag);
      if (mediumEls && (mediumEls.length > 0)) {
        info[mediumTerm] = mediumEls[0].textContent.trim().substring(mediumFlag.length).trim();
      }
      if (mediumEls.length > 1) {
        console.warn("WARNING: There were more than one "+mediumTerm+" elements ("+mediumTag+" containing \""+mediumFlag+"\"");
      }
    }
    if (descriptionTag && descriptionClassName) {
      var descriptionEls = getElementsByTagWhereClassStartsWith(descriptionTag, descriptionClassName);
      if (descriptionEls && (descriptionEls.length > 0)) {
        info.description = descriptionEls[0].textContent.trim();
        var descriptionFlag = "Description:";
        if (info.description.startsWith(descriptionFlag)) {
          info.description = info.description.substring(descriptionFlag.length).trim();
        }
      }
      if (descriptionEls.length > 1) {
        console.warn("WARNING: There were more than one description elements (tagName "+descriptionTag+" where className starts with \""+descriptionClassName+"\"");
      }
    }
    if (collaboratorsClassName) {
      var collaboratorDivs = document.getElementsByClassName(collaboratorsClassName);
      if (collaboratorDivs.length > 0) {
        info.collaboratorElements = collaboratorElements;
        var goodCollaboratorsFlag = "Collaborators:";
        if (collaboratorDivs[0].children.length >= 2) {
          if (!collaboratorDivs[0].children[0].textContent.includes(goodCollaboratorsFlag)) {
            console.warn("The first child of div class " + collaboratorsClassName + " does not say \"" + goodCollaboratorsFlag + "\"");
          }
          var collaboratorsContainerE = collaboratorDivs[0].children[1];
          var thisAuthorE = {};
          for (var i=0, max=collaboratorsContainerE.children.length; i < max; i++) {
            thisAuthorE = collaboratorsContainerE.children[i].firstChild; //firstChild of the <div ...> is <a ...>
            //var tmpAuthorObj = {};
            //tmpAuthorObj.textContent = thisAuthorE.textContent;
            //tmpAuthorObj.href = thisAuthorE.href; // TODO: Why is this necessary (href is blank during iteration otherwise)?
            if (verbose) {
              if (!thisAuthorE.href) {
                console.warn("- collaborator " + thisAuthorE.textContent + " href is blank in addButton: \"" + thisAuthorE.href + "\"")
              }
              // else {
                // console.warn("- collaborator " + thisAuthorE.textContent + " href is non-blank in addButton: \"" + thisAuthorE.href + "\"")
              // }
            }
            info.collaboratorElements.push(thisAuthorE);
          }
        }
        else {
          console.warn("div class " + collaboratorsClassName + " should have 2 children but has " + collaboratorDivs[0].children.length + ".");
        }
      }
      // ^ Such as on opengameart: <div class="field field-name-field-collaborators field-type-user-reference field-label-above">
      //                <div class="field-label">Collaborators:&nbsp;</div>
      //                <div class="field-items">
      //                  <div class="field-item even"><a href="/users/daneeklu">daneeklu</a></div>
      //                  <div class="field-item odd"><a href="/users/jetrel">Jetrel</a></div>
      //                  <div class="field-item even"><a href="/users/hyptosis">Hyptosis</a></div>
      //                  <div class="field-item odd"><a href="/users/redshrike">Redshrike</a></div>
      //                  <div class="field-item even"><a href="/users/bertram">Bertram</a></div></div>
      //                </div>

      // TODO: add artTypeStr
      // ^ Such as on opengameart: <div class="field field-name-field-art-type field-type-taxonomy-term-reference field-label-above">
      //                <div class="field-label">Art Type:&nbsp;</div>
      //                <div class="field-items">
      //                  <div class="field-item even"><a href="/art-search-advanced?field_art_type_tid%5B%5D=9" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">2D Art</a></div></div></div><div class="field field-name-field-art-tags field-type-taxonomy-term-reference field-label-above"><div class="field-label">Tags:&nbsp;</div><div class="field-items"><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=RPG" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">RPG</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=tiles" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">tiles</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=32x32" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">32x32</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=food" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">food</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=Wood" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">Wood</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=Market%20Booth" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">Market Booth</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=grass" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">grass</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=water" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">water</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=path" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">path</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=cobblestone" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">cobblestone</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=firewood" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">firewood</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=table" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">table</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=dock" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">dock</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=boat" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">boat</a></div></div></div><div class="field field-name-field-art-licenses field-type-taxonomy-term-reference field-label-above"><div class="field-label">License(s):&nbsp;</div><div class="field-items"><div class="field-item even"><div class='license-icon'><a href='http://creativecommons.org/licenses/by-sa/3.0/' target='_blank'><img src='https://opengameart.org/sites/default/files/license_images/cc-by-sa.png' alt='' title=''><div class='license-name'>CC-BY-SA 3.0</div></a></div></div></div></div><div class="field field-name-collect field-type-ds field-label-above"><div class="field-label">Collections:&nbsp;</div><div class="field-items"><div class="field-item even"><div class='collect-container'><ul><li><a href="/content/04-pixel-art-terrain">04. Pixel Art - Terrain</a></li><li><a href="/content/2-acetoxy-nnn-trimethylethanaminium">2-Acetoxy-N,N,N-trimethylethanaminium</a></li><li><a href="/content/2d-rpg-lpc-compatible-tilessprites">2D - RPG - [LPC]-Compatible Tiles/Sprites</a></li><li><a href="/content/2d-32x32">2D 32x32</a></li><li><a href="/content/2d-tilesets-topview">2D tilesets topview</a></li><li><a href="/content/2dtileorthogonal">2D::Tile::Orthogonal</a></li><li><a href="/content/32x32-fantasy-tiles">32x32 Fantasy Tiles</a></li><li><a href="/content/acid">Acid</a></li><li><a href="/content/andruil-rpg">Andruil RPG</a></li><li><a href="/content/art-used-in-dusk-graphical-mud">Art used in Dusk Graphical MUD</a></li><li><a href="/content/assets-for-planned-use-in-realm-of-kuhraiy">Assets for Planned Use in Realm of Kuhraiy</a></li><li><a href="/content/awesome-game-art">Awesome Game Art</a></li><li><a href="/content/backgrounds-6">BACKGROUNDS</a></li><li><a href="/content/base-pixel-art-for-3d-pixelish-rpg">Base pixel art for 3D pixelish RPG</a></li><li><a href="/content/besidethevoids-downloads">BesideTheVoid&#039;s Downloads</a> (<a href="/collect/remove/14914/85607" class="collect-remove">remove</a>)</li><li><a href="/content/best-orthogonal-rectangular-tilesets-for-tilemaps">Best Orthogonal (rectangular) Tilesets for Tilemaps</a></li><li><a href="/content/bits-and-bobs">Bits and Bobs</a></li><li><a href="/content/bunchofheroes">BunchOfHeroes</a></li><li><a href="/content/c-dogs-sdl-art">C-Dogs SDL art</a></li><li><a href="/content/conquest-rpg-assets">Conquest RPG Assets</a></li><li><a href="/content/credits-0">Credits</a></li><li><a href="/content/ctf">CTF</a></li><li><a href="/content/dungeon-slayer-art">Dungeon Slayer Art</a></li><li><a href="/content/fantasy-6">Fantasy</a></li><li><a href="/content/field-guardians">Field Guardians</a></li><li><a href="/content/game-prototype-art-assets">Game Prototype Art Assets </a></li><li><a href="/content/gamecollection">GameCollection</a></li><li><a href="/content/golden-axe">Golden Axe</a></li><li><a href="/content/hero-game">hero game</a></li><li><a href="/content/hq-2d-isometric">HQ 2D &amp; Isometric</a></li><li><a href="/content/infinimon-procedurally-generated-pokemon-or-digimon-style-game-assets">Infinimon - Procedurally-Generated Pokemon- or Digimon-style Game Assets</a></li><li><a href="/content/liberated-pixel-cup-0">Liberated Pixel Cup</a></li><li><a href="/content/long-licence-fantasy-modern-game">long licence fantasy modern game</a></li><li><a href="/content/loot-run">Loot run</a></li><li><a href="/content/lpc-1">LPC</a></li><li><a href="/content/lpc-compatible-terraintiles">LPC Compatible Terrain/Tiles</a></li><li><a href="/content/lpc-gfx">LPC GFX</a></li><li><a href="/content/maybe-assets-for-treasure-other">maybe assets for Treasure (+other)</a></li><li><a href="/content/medicines-disordered-list-of-fantasy-rpg-tilesets">Medicine&#039;s disordered list of Fantasy RPG Tilesets</a></li><li><a href="/content/minimmo-project">Minimmo project</a></li><li><a href="/content/mittys-maize">Mitty&#039;s Maize</a></li><li><a href="/content/must-use">Must Use</a></li><li><a href="/content/non-commercial-art">Non-Commercial - Art</a></li><li><a href="/content/oddball-gamez-lpc-style">Oddball Gamez LPC Style</a></li><li><a href="/content/one-click-minecraft">one click minecraft</a></li><li><a href="/content/pixelfarm">PixelFarm</a></li><li><a href="/content/roguelike">Roguelike</a></li><li><a href="/content/rpg-2">RPG</a></li><li><a href="/content/rpg-5">RPG</a></li><li><a href="/content/rpg-stuff-collection">RPG Stuff Collection</a></li><li><a href="/content/sets">SETS</a></li><li><a href="/content/smartpoints-example-game">SmartPoints Example Game</a></li><li><a href="/content/snes-style-rpg">SNES Style RPG</a></li><li><a href="/content/snes-like-world-textures">snes-like world textures</a></li><li><a href="/content/sprites-2">Sprites</a></li><li><a href="/content/stardont">stardont</a></li><li><a href="/content/stendhal">Stendhal</a></li><li><a href="/content/terrain-transitions">Terrain transitions</a></li><li><a href="/content/test-10">test</a></li><li><a href="/content/test-5">Test</a></li><li><a href="/content/test-11">test</a></li><li><a href="/content/the-weary-adventurer">The Weary Adventurer</a></li><li><a href="/content/thing">Thing</a></li><li><a href="/content/tile-4">TILE</a></li><li><a href="/content/tilesets-and-backgrounds-pixelart">Tilesets and Backgrounds (PixelArt)</a></li><li><a href="/content/top-down-2d-jrpg-32x32-art-collection">Top Down 2D JRPG 32x32 Art Collection</a></li><li><a href="/content/top-down-rpg-pixel-art">Top Down RPG Pixel Art</a></li><li><a href="/content/top-down-2d-rpg">Top-down 2D RPG</a></li><li><a href="/content/topdown-tiles">topdown tiles</a></li><li><a href="/content/trevas">Trevas</a></li><li><a href="/content/ultimate-tabletop">Ultimate TableTop</a></li><li><a href="/content/used-in-hero-of-allacrost">Used in Hero of Allacrost</a></li><li><a href="/content/used-in-valyria-tear">Used in Valyria tear</a></li><li><a href="/content/wastelander">Wastelander</a></li><li><a href="/content/workable-style-32x32-tiles">Workable style 32x32 tiles</a></li><li><a href="/content/zed-interesting-yet-unsorted">Zed - Interesting Yet Unsorted</a></li><li><a href="/content/zelda-like-rpg">Zelda Like RPG</a></li><li><a href="/content/zombie-buster-project">zombie-buster project</a></li></ul></div></div></div></div><div class="field field-name-favorites field-type-ds field-label-inline clearfix"><div class="field-label">Favorites:&nbsp;</div><div class="field-items"><div class="field-item even">235</div></div></div><div class="field field-name-flag-favorite field-type-ds field-label-hidden"><div class="field-items"><div class="field-item even"><span class="flag-wrapper flag-favorites flag-favorites-14914">
    }

    var submittedDateStr = null; // formerly createdStr
    // var headingCreatedParts = getDivsWhereClassStartsWith(headingCreatedPrefix);
    // var submittedDateDivs = document.getElementsByClassName(submittedDateGrandParentClassName);
    var submittedDateDivs = getElementsByTagWhereChildHasClass(dateTagName, "fa-calendar-alt");
    /* ^ FontAwesome rewrites the HTML (!!):
     <li class="list-group-item"><i class="far fa-calendar-alt"
                            style="color:#40c057;margin-right: 0.25rem;"></i>
                        August 29, 2018</li>
     BECOMES:
     <svg class="svg-inline--fa fa-calendar-alt fa-w-14" . . .
    */

    if (submittedDateDivs.length > 0) {
      // var submittedDateE = submittedDateDivs[0].firstChild.firstChild;
      // submittedDateStr = submittedDateE.textContent;
      // ^ such as in <div class="field field-name-post-date field-type-ds field-label-hidden">
      //                <div class="field-items">        <!--.firstChild-->
      //                  <div class="field-item even">Thursday, January 31, 2013 - 08:06</div></div></div><div class="field field-name-field-collaborators field-type-user-reference field-label-above"><div class="field-label">Collaborators:&nbsp;</div><div class="field-items"><div class="field-item even"><a href="/users/daneeklu">daneeklu</a></div><div class="field-item odd"><a href="/users/jetrel">Jetrel</a></div><div class="field-item even"><a href="/users/hyptosis">Hyptosis</a></div><div class="field-item odd"><a href="/users/redshrike">Redshrike</a></div><div class="field-item even"><a href="/users/bertram">Bertram</a></div></div></div><div class="field field-name-field-art-type field-type-taxonomy-term-reference field-label-above"><div class="field-label">Art Type:&nbsp;</div><div class="field-items"><div class="field-item even"><a href="/art-search-advanced?field_art_type_tid%5B%5D=9" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">2D Art</a></div></div></div><div class="field field-name-field-art-tags field-type-taxonomy-term-reference field-label-above"><div class="field-label">Tags:&nbsp;</div><div class="field-items"><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=RPG" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">RPG</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=tiles" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">tiles</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=32x32" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">32x32</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=food" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">food</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=Wood" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">Wood</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=Market%20Booth" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">Market Booth</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=grass" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">grass</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=water" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">water</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=path" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">path</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=cobblestone" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">cobblestone</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=firewood" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">firewood</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=table" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">table</a></div><div class="field-item even"><a href="/art-search-advanced?field_art_tags_tid=dock" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">dock</a></div><div class="field-item odd"><a href="/art-search-advanced?field_art_tags_tid=boat" typeof="skos:Concept" property="rdfs:label skos:prefLabel" datatype="">boat</a></div></div></div><div class="field field-name-field-art-licenses field-type-taxonomy-term-reference field-label-above"><div class="field-label">License(s):&nbsp;</div><div class="field-items"><div class="field-item even"><div class='license-icon'><a href='http://creativecommons.org/licenses/by-sa/3.0/' target='_blank'><img src='https://opengameart.org/sites/default/files/license_images/cc-by-sa.png' alt='' title=''><div class='license-name'>CC-BY-SA 3.0</div></a></div></div></div></div><div class="field field-name-collect field-type-ds field-label-above"><div class="field-label">Collections:&nbsp;</div><div class="field-items"><div class="field-item even"><div class='collect-container'><ul><li><a href="/content/04-pixel-art-terrain">04. Pixel Art - Terrain</a></li><li><a href="/content/2-acetoxy-nnn-trimethylethanaminium">2-Acetoxy-N,N,N-trimethylethanaminium</a></li><li><a href="/content/2d-rpg-lpc-compatible-tilessprites">2D - RPG - [LPC]-Compatible Tiles/Sprites</a></li><li><a href="/content/2d-32x32">2D 32x32</a></li><li><a href="/content/2d-tilesets-topview">2D tilesets topview</a></li><li><a href="/content/2dtileorthogonal">2D::Tile::Orthogonal</a></li><li><a href="/content/32x32-fantasy-tiles">32x32 Fantasy Tiles</a></li><li><a href="/content/acid">Acid</a></li><li><a href="/content/andruil-rpg">Andruil RPG</a></li><li><a href="/content/art-used-in-dusk-graphical-mud">Art used in Dusk Graphical MUD</a></li><li><a href="/content/assets-for-planned-use-in-realm-of-kuhraiy">Assets for Planned Use in Realm of Kuhraiy</a></li><li><a href="/content/awesome-game-art">Awesome Game Art</a></li><li><a href="/content/backgrounds-6">BACKGROUNDS</a></li><li><a href="/content/base-pixel-art-for-3d-pixelish-rpg">Base pixel art for 3D pixelish RPG</a></li><li><a href="/content/besidethevoids-downloads">BesideTheVoid&#039;s Downloads</a> (<a href="/collect/remove/14914/85607" class="collect-remove">remove</a>)</li><li><a href="/content/best-orthogonal-rectangular-tilesets-for-tilemaps">Best Orthogonal (rectangular) Tilesets for Tilemaps</a></li><li><a href="/content/bits-and-bobs">Bits and Bobs</a></li><li><a href="/content/bunchofheroes">BunchOfHeroes</a></li><li><a href="/content/c-dogs-sdl-art">C-Dogs SDL art</a></li><li><a href="/content/conquest-rpg-assets">Conquest RPG Assets</a></li><li><a href="/content/credits-0">Credits</a></li><li><a href="/content/ctf">CTF</a></li><li><a href="/content/dungeon-slayer-art">Dungeon Slayer Art</a></li><li><a href="/content/fantasy-6">Fantasy</a></li><li><a href="/content/field-guardians">Field Guardians</a></li><li><a href="/content/game-prototype-art-assets">Game Prototype Art Assets </a></li><li><a href="/content/gamecollection">GameCollection</a></li><li><a href="/content/golden-axe">Golden Axe</a></li><li><a href="/content/hero-game">hero game</a></li><li><a href="/content/hq-2d-isometric">HQ 2D &amp; Isometric</a></li><li><a href="/content/infinimon-procedurally-generated-pokemon-or-digimon-style-game-assets">Infinimon - Procedurally-Generated Pokemon- or Digimon-style Game Assets</a></li><li><a href="/content/liberated-pixel-cup-0">Liberated Pixel Cup</a></li><li><a href="/content/long-licence-fantasy-modern-game">long licence fantasy modern game</a></li><li><a href="/content/loot-run">Loot run</a></li><li><a href="/content/lpc-1">LPC</a></li><li><a href="/content/lpc-compatible-terraintiles">LPC Compatible Terrain/Tiles</a></li><li><a href="/content/lpc-gfx">LPC GFX</a></li><li><a href="/content/maybe-assets-for-treasure-other">maybe assets for Treasure (+other)</a></li><li><a href="/content/medicines-disordered-list-of-fantasy-rpg-tilesets">Medicine&#039;s disordered list of Fantasy RPG Tilesets</a></li><li><a href="/content/minimmo-project">Minimmo project</a></li><li><a href="/content/mittys-maize">Mitty&#039;s Maize</a></li><li><a href="/content/must-use">Must Use</a></li><li><a href="/content/non-commercial-art">Non-Commercial - Art</a></li><li><a href="/content/oddball-gamez-lpc-style">Oddball Gamez LPC Style</a></li><li><a href="/content/one-click-minecraft">one click minecraft</a></li><li><a href="/content/pixelfarm">PixelFarm</a></li><li><a href="/content/roguelike">Roguelike</a></li><li><a href="/content/rpg-2">RPG</a></li><li><a href="/content/rpg-5">RPG</a></li><li><a href="/content/rpg-stuff-collection">RPG Stuff Collection</a></li><li><a href="/content/sets">SETS</a></li><li><a href="/content/smartpoints-example-game">SmartPoints Example Game</a></li><li><a href="/content/snes-style-rpg">SNES Style RPG</a></li><li><a href="/content/snes-like-world-textures">snes-like world textures</a></li><li><a href="/content/sprites-2">Sprites</a></li><li><a href="/content/stardont">stardont</a></li><li><a href="/content/stendhal">Stendhal</a></li><li><a href="/content/terrain-transitions">Terrain transitions</a></li><li><a href="/content/test-10">test</a></li><li><a href="/content/test-11">test</a></li><li><a href="/content/test-5">Test</a></li><li><a href="/content/the-weary-adventurer">The Weary Adventurer</a></li><li><a href="/content/thing">Thing</a></li><li><a href="/content/tile-4">TILE</a></li><li><a href="/content/tilesets-and-backgrounds-pixelart">Tilesets and Backgrounds (PixelArt)</a></li><li><a href="/content/top-down-2d-jrpg-32x32-art-collection">Top Down 2D JRPG 32x32 Art Collection</a></li><li><a href="/content/top-down-rpg-pixel-art">Top Down RPG Pixel Art</a></li><li><a href="/content/top-down-2d-rpg">Top-down 2D RPG</a></li><li><a href="/content/topdown-tiles">topdown tiles</a></li><li><a href="/content/trevas">Trevas</a></li><li><a href="/content/ultimate-tabletop">Ultimate TableTop</a></li><li><a href="/content/used-in-hero-of-allacrost">Used in Hero of Allacrost</a></li><li><a href="/content/used-in-valyria-tear">Used in Valyria tear</a></li><li><a href="/content/wastelander">Wastelander</a></li><li><a href="/content/workable-style-32x32-tiles">Workable style 32x32 tiles</a></li><li><a href="/content/zed-interesting-yet-unsorted">Zed - Interesting Yet Unsorted</a></li><li><a href="/content/zelda-like-rpg">Zelda Like RPG</a></li><li><a href="/content/zombie-buster-project">zombie-buster project</a></li></ul></div></div></div></div><div class="field field-name-favorites field-type-ds field-label-inline clearfix"><div class="field-label">Favorites:&nbsp;</div><div class="field-items"><div class="field-item even">235</div></div></div><div class="field field-name-flag-favorite field-type-ds field-label-hidden"><div class="field-items"><div class="field-item even"><span class="flag-wrapper flag-favorites flag-favorites-14914">
      //     <a href="/flag/flag/favorites/14914?destination=node/14914&amp;token=NF4Z1O1g9CwLU2n65PscJkJeHBLLkg75lOKLirEfrdI" title="" class="flag flag-action flag-link-toggle" rel="nofollow">Add to Favorites</a><span class="flag-throbber">&nbsp;</span>
      submittedDateStr = submittedDateDivs[0].textContent.trim();
    }
    else {
      console.warn("The date is missing. There are no divs with a class " + submittedDateGrandParentClassName + " having a great grandchild");
    }
    info.titleHref = window.location.href;
    // console.log("info.title: " + info.title);
    // console.log("info.titleHref: " + info.titleHref);
    console.log("submittedDateStr: " + submittedDateStr);
    /*
    // OpenGameArt format:
    if (submittedDateStr !== null) {
      var createdParts = submittedDateStr.split(" ");
      if (createdParts.length >= 4) {
        // 0 is day of week spelled out
        var yI = 3;
        var dI = 2;
        var mI = 1;
        var tI = createdParts.length - 1;
        var yStr = createdParts[yI];
        var dStr = createdParts[dI];
        var mStr = createdParts[mI];
        if (dStr.endsWith(",")) {
          info.month = mStr;
          info.day = dStr.slice(0, -1);
          info.year = yStr;
          if (createdParts.length >= tI) {
            var tStr = createdParts[tI];
            if (tStr.includes(":")) {
              info.time = tStr;
            }
            else {
              console.warn("The time string wasn't found (doesn't have ':') as the last space-separated element of \""+submittedDateStr+"\"");
            }
          }
        }
        else {
          console.warn("A date in the format \"DAY_OF_WEEK MON, D, YYYY HH:MM\" was expected but got: \""+submittedDateStr+"\"");
        }
      }
    }
    */
    if (submittedDateStr !== null) {
      var createdParts = submittedDateStr.split(" ");
      if (createdParts.length >= 4) {
        // blendswap.com format is like: "August 29, 2018"
        var mI = 0;
        var dI = 1;
        var yI = 2;
        var yStr = createdParts[yI];
        var dStr = createdParts[dI];
        var mStr = createdParts[mI];
        if (dStr.endsWith(",")) {
          info.month = mStr;
          info.day = dStr.slice(0, -1);
          info.year = yStr;
          // info.time = null;
        }
        else {
          console.warn("A date in the format \"MON D, YYYY\" was expected but got: \""+submittedDateStr+"\"");
        }
      }
    }

    // var licenseAnchors = getAnchorsWhereClassStartsWith(licenseAnchorPrefix);
    var licenseContainerElements = document.getElementsByClassName(licenseAContainerClass);
    if (licenseContainerElements.length > 0) {
        info.licenses = [];
    }
    for (var lai=0, aMax=licenseContainerElements.length; lai < aMax; lai++) {
      var thisLicenseEl = licenseContainerElements[lai];
      var licenseOpener = "License: ";
      var textContentTrim = thisLicenseEl.textContent.trim();
      if (textContentTrim.startsWith(licenseOpener)) {
        // blendswap.com format
        var licenseNoAnchor = document.createElement('a');
        var licenseStr = textContentTrim.substring(licenseOpener.length).trim();
        var correctedLicenseStr = null;
        for (const [tryBS, tryShort] of Object.entries(blendSwapNames)) {
          if (tryBS == licenseStr) {
            correctedLicenseStr = tryShort;
            licenseNoAnchor.shortLicenseStr = correctedLicenseStr;
            break;
          }
        }
        if (correctedLicenseStr == null) {
          alert("Error in " + myName + ": \""+licenseStr+"\" is not a known license even in known parts of blendswaps incorrect CC name formatting so it can't be corrected.")
        }
        // urlSmallNames has url / and following as key and name as value:
        // licenseNoAnchor.href = undefined;
        var licenseHref = undefined;
        for (const [tryKey, tryValue] of Object.entries(urlSmallNames)) {
          if (tryValue == correctedLicenseStr) {
            licenseHref = tryKey; // Don't set licenseNoAnchor here or the partial URL will automatically get the BaseURL from the DOM!
            break;
          }
        }
        if (licenseHref) {
          if (!licenseHref.includes(":")) {
            if (licenseHref.startsWith("/")) {
              licenseHref = "https://creativecommons.org/licenses" + licenseHref;
            }
            else {
              licenseHref = "https://" + licenseHref;
            }
          }
          // else has ":" so assume the href is correct now.
          if (licenseHref.slice(-2, -1) == ".") { // -2 instead of -3 since using this scripts own URL substrings in the case that the URL is being generated
            licenseNoAnchor.exactLicenseVersion = licenseHref.slice(-4, -1);
          }
          else {
            console.warn("slice at -2 is not '.' but '" + licenseHref.slice(-2, -1) + "'. The license version seems to be malformed: \"" + licenseHref + "\"");
          }
        }
        else {
          alert("Error in " + myName + ": urlSmallNames had no key with a value matching the license \""+correctedLicenseStr+"\".");
        }
        if (verbose) {
          console.log("* writing license with href: " + licenseHref)
          console.log("  * with shortLicenseStr: " + licenseNoAnchor.shortLicenseStr)
        }
        licenseNoAnchor.href = licenseHref;
        info.licenses.push(licenseNoAnchor);
        continue;
      }
      else {
        continue; // skip non-blendswap format
      }
      var licenseAnchors = licenseContainerElements[lai].children;
      if ((licenseAnchors.length > 0) && (licenseAnchors[0].href)) {
        console.log("Checking " + licenseAnchors.length + " license anchors...");
        var licenseA = licenseAnchors[0];
        licenseA.exactLicenseVersion = null;
        if (verbose) {
          console.log("  checking " + licenseA.className + "...");
          // NOTE: .getAttribute("href") gets the raw value, but .href gets the resulting full URL.
          console.log("  licenseA.href is a " + typeof licenseA.href);
          console.log("  licenseA.href.toString is a " + typeof licenseA.href.toString);
          console.log("  licenseA.href.toString().includes is a " + typeof licenseA.href.toString().includes);
        }
        if (licenseA.href === undefined) {
          console.warn("A license a.href is undefined.");
        }
        // else if (typeof licenseA.href.toString !== 'function') {
        //   console.warn("A license a.href.toString is not a function.");
        // }
        else if (typeof licenseA.href.includes !== 'function') {
          // NOTE: Firefox 48 removes the "contains" prototype--you must use includes!
          // console.warn("A license a.getAttribute(\"href\").includes is not a function.");
          console.warn("A license a.href.toString.includes is not a function.");
        }
        else {
          if (licenseA.href.includes("opengameart.org") || licenseA.href.startsWith("/")) {
            console.warn("The license anchor should be an external link to the license but is \"" + licenseA.href + "\"");
          }
          if (verbose) {
            console.log("licenseA.href: '''", );
            console.log(licenseA.href);
            console.log("'''");
          }
          if (licenseA.href.slice(-3, -2) == ".") {
            licenseA.exactLicenseVersion = licenseA.href.slice(-4, -1);
          }
          else {
            console.warn("slice at -3 is not '.' but '" + licenseA.href.slice(-3, -2) + "'. The license version seems to be malformed: \"" + licenseA.href + "\"");
          }
          info.licenses.push(licenseA);
        }

      }
      else {
        console.warn("There is no anchor in a class like "+licenseAContainerClass+"*" + "[" + lai + "]");
      }
    }
    if (info.licenses) {
      if (info.licenses.length == 0) {
        info.licenses = undefined;
      }
    }
    var attributionAncestorClassName = "field-name-field-copyright-notice";
    // ^ Can also be field-name-field-art-attribution (content: "Attribution Instructions")
    var attributionAncestorElements = document.getElementsByClassName(attributionAncestorClassName);
    if (attributionAncestorElements.length < 1) {
        // The field is optional, so only warn if verbose.
        if (verbose) {
            // console.log("INFO: class \"" + attributionAncestorClassName + "\" is not present (This is an optional field).");
        }
        attributionAncestorClassName = "field-name-field-art-attribution";
        attributionAncestorElements = document.getElementsByClassName(attributionAncestorClassName);
        if (attributionAncestorElements.length < 1) {
            if (verbose) {
                // console.log("INFO: class \"" + attributionAncestorClassName + "\" is not present (This is an optional field).");
            }
            return info;
        }
        else {
            info.goodAttributionNoticeFlag = "Attribution Instructions"
        }
    }
    else {
        info.goodAttributionNoticeFlag = "Copyright/Attribution Notice";
    }

    if (!attributionAncestorElements[0].children[0].textContent.includes(info.goodAttributionNoticeFlag)) {
      console.warn("The " + attributionAncestorClassName + ".firstChild should contain \"" + info.goodAttributionNoticeFlag + "\" but is \"" + attributionAncestorElements[0].children[0].textContent + "\"")
    }
    var attributionE = attributionAncestorElements[0].children[1].firstChild;
    // ^ Such as <div class="field field-name-field-copyright-notice field-type-text-long field-label-above">  <!--attributionAncestorElements[0]-->
    //             <div class="field-label">Copyright/Attribution Notice:&nbsp;</div>                          <!--attributionAncestorElements[0].children[0]-->
    //             <div class="field-items">                                                                   <!--attributionAncestorElements[0].children[1]-->
    //               <div class="field-item even">&quot;Adobe Town Set&quot;
    //                 Artist: bluecarrot16
    info.attributionNotice = attributionE.textContent;
    return info;
  }

  function addButton() {
    'use strict';
    var pageInfoE = getButtonContainer();
    if (pageInfoE == null) {
      var msg = 'The '+buttonContainerClassName+' class was not found for placing the button!';
      console.log(msg);
      pageInfoE = document.getElementsByTagName("body")[0];
      // return;
    }

    //or:
    // See https://www.w3schools.com/jsref/met_document_createelement.asp
    var btn = document.createElement("BUTTON"); // Create a <button> element
    btn.setAttribute("class", "btn btn-secondary");
    btn.setAttribute("style", "background-color: rgb(50%, 50%, 50%)");
    var btnText = "Copy Markdown";
    btn.innerHTML = btnText; // Insert text
    // Any URL starting with a slash comes after: "https://creativecommons.org/licenses"
    // otherwise it comes after "https://"
    // - A list of CC licenses is at <https://creativecommons.org/about/cclicenses/>.

    btn.addEventListener("click", function(){
      btn.innerHTML = btnText;
      var info = getInfo();
      if (info.licenses) {
        for (var i=0, max=info.licenses.length; i < max; i++) {
          populateCorrespondingLicenseFields(info.licenses[i]);
        }
      }
      else {
        alert("Error in " + myName + ": The license was not detected.");
      }
      var markdownStr = getMarkdown(info);
      var nyiMsg = "";
      if (!info[programVersionTerm]) nyiMsg += "\n- "+programVersionTerm+" "; // get list-group-item with textContent "Blender " // followed by version
      if (!info[mediumTerm]) nyiMsg += "\n- "+mediumTerm+": "; // get list-group-item with textContent "Render: " // followed by renderer
      if (!info.authorE || info.authorE.textContent.trim().length < 2) {
        nyiMsg += "\n- Author: ";
      }
      if (!info.title || info.title.trim().length < 2) {
        nyiMsg += "\n- Title: ";
      }
      if (!info.licenses || info.licenses.length < 1) {
        nyiMsg += "\n- License: ";
      }
      info.licenses
      if (!info.description) nyiMsg += "\n\n\n## Description";
      if (nyiMsg.length > 0) {
        // markdownStr = "\nError in " + myName + ": NotYetImplemented: " + nyiMsg + "\n\n\n" + markdownStr;
        markdownStr += "\n\nError in " + myName + ": Everything below is NotYetImplemented so you'll have to copy it manually.\n\n" + nyiMsg + "\n";
      }

      setClipboardText(markdownStr, btn);
    }); // end addEventListener click
    // pageInfoE.appendChild(btn); // Append <button> for Markdown to whatever element was selected.
    pageInfoE.prepend(btn); // prepend <button> for Markdown to whatever element was selected.
  }//end addButton
  function checkIfComplete() {
    // console.log("Monitoring page loading...");
    var ready = true;
    if (!hasAllClasses(doneClasses)) {
        ready = false;
    }
    if (ready) {
      if (verbose) {
        console.log("The page has loaded.");
      }
      clearInterval(checkTimer);
      addButton();
      console.log("The license detection will resume after a user clicks the generated \"Copy\" button.");
    }
    else {
      console.log("The document is not ready (or is missing required fields)...");
    }
  }
  checkTimer = setInterval(checkIfComplete, 200);
})();
