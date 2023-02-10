// ==UserScript==
// @name         AWC Devtool
// @namespace    https://github.com/Zeliper/AWC_DevTool
// @updateURL    https://github.com/Zeliper/AWC_DevTool/raw/main/AWC_DevTool.js
// @downloadURL  https://github.com/Zeliper/AWC_DevTool/raw/main/AWC_DevTool.js
// @version      1.2
// @description  Based On AWC 6.0 & TC13.3
// @author       Oh Seung Woo
// @match        localhost
// @include      https://qps-detest.singlex.com/
// @include      https://qps-lge-stg.singlex.com/
// @include      https://qps-dev.singlex.com/
// @include      lgsp
// @icon         <$ICON$>
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==
/*
* 2022.02.10 : 1.1 -> 1.2 마무리 작업
*     Single Query 추가
*     Load 완료 메세지 정리 및 도움말 함수 추가
*
* 2022.02.10 : 0.1 -> 1.1 정식 버전 업데이트
*     AwcObjectUtil 종속성 제거 (OOTB 모듈 사용으로 교체)
*     Build시 bundle화 된 소스코드 로드 가능하게 로직 변경
*/
unsafeWindow.on = true;
(async function() {
    'use strict';
    let LoadedModuleName = [];
    let FailedModuleName = [];
    let InitModules = async (_ModuleNames,AdditionalFunction) => {
        for(let _module of _ModuleNames){
            try{
                if(unsafeWindow.afxWeakImport(_module.deps)){
                    unsafeWindow[_module.name] = unsafeWindow.afxWeakImport(_module.deps);
                    LoadedModuleName.push(_module.name);
                }else{
                    FailedModuleName.push(_module.deps);
                }
            }catch(e){
                FailedModuleName.push(_module.deps);
            }
        }
        AdditionalFunction();
    }

    function httpGet( theUrl ) {
        return new Promise( ( resolve, reject ) => {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() {
                if( xmlHttp.readyState === 4 && xmlHttp.status === 200 ) {
                    resolve( xmlHttp.responseText );
                }
            };

            xmlHttp.onerror = function( e ) {
                reject( e );
            };

            xmlHttp.open( 'GET', theUrl, true ); // true for asynchronous
            xmlHttp.send( null );
        } );
    }
    let configSvc;
    let __CfgSvc = await unsafeWindow.afxDynamicImport(['js/configurationService'],(e)=>configSvc = e);
    let baseUrl = configSvc.config.baseUrl;
    let jsString = await httpGet(baseUrl + "/js/afxImport.js");
    let modules = jsString.split(`require.cache[require.resolveWeak('`).filter(e=>e.split(`//`).length < 2).map(e=>e.split(`')]`)[0]);
	let jsons = modules.filter(e=>e.split(".directive").length <2).filter(e=>e.split(".controller").length <2).filter(e => e);
    let Modules = [];
    for(let json of jsons){
        let name = json;
        if(json.split("js/").length > 2){
            name = json.split("js/")[1]
        }
        let modulePath = json;
        if(name.split(".service").length >1){
            name = name.split(".service")[0];
        }
        if(name.split("/").length > 1){
            name = name.split("/")[name.split("/").length -1];
        }

        Modules.push({deps : modulePath, name : name});
    }
    await InitModules(Modules,()=>{
		unsafeWindow.ctx = unsafeWindow.appCtxService.ctx;
	});

    unsafeWindow.getLoadedModules = LoadedModuleName;
    unsafeWindow.getFailedModules = FailedModuleName;
    let fort = (...args) => {
        let msg = "#  ";
        for(let m of args){
            msg += m;
        }
        msg+= " ".repeat(80-msg.length) + "#\n";
        return msg;
    }
    //#################################################################################################
    // Automation 함수
    //#################################################################################################
    unsafeWindow.getObj = (uids) => {
        if (Array.isArray(uids)){
            return unsafeWindow.clientDataModel.getObjects(uids);
        }else{
            return unsafeWindow.clientDataModel.getObject(uids);
        }
    }
    unsafeWindow.getProps = async (uids,props) => {
        let IUids = [];
        let Objs = [];
        if (Array.isArray(uids)){
            if(typeof uids[0] == "string"){
                Objs = unsafeWindow.getObj(uids);
            }else{
                Objs = uids;
            }
        }else{
            if(typeof uids == "string"){
                Objs.push(unsafeWindow.getObj(uids));
            }else{
                Objs.push(uids);
            }
        }
        if (!Array.isArray(props)){
            props = [props];
        }
        let soaInputParam = {
          objects: Objs,
          attributes: props
        }
	return soaService.post( 'Core-2006-03-DataManagement', 'getProperties', soaInputParam );
    }
    unsafeWindow.getData = (elements) =>{
        if(Array.isArray(elements)){
            let outData = [];
            for(let element of elements){
                outData.push(unsafeWindow.viewModelService.getViewModelUsingElement(element));
            }
            return outData;
        }else{
            return unsafeWindow.viewModelService.getViewModelUsingElement(elements);
        }
    }
    unsafeWindow.getDoc = (query) =>{
        let docs = document.querySelectorAll(query);
        if(docs.length > 1){
            return docs;
        }
        else if (docs.length == 1){
            return docs[0];
        }else{
            return null;
        }
    }
    unsafeWindow.checkCondition = (expression,dataElement = null) =>{
        let declViewModel = {};
        declViewModel.data = unsafeWindow.getData(dataElement);
        declViewModel.ctx = unsafeWindow.ctx;
        let scope = unsafeWindow.angular.element(dataElement);
        return unsafeWindow.conditionService.evaluateCondition(declViewModel,expression);
    }
    unsafeWindow.q = (query) => {
        return unsafeWindow.document.querySelector(query);
    }

    //#################################################################################################
    //  설명서 추가
    //#################################################################################################
    let loadSuccess = () => {
      let msg = "\n###############################[ DevTool Loaded! ]###############################\n";
      msg    += fort("");
      msg    += fort("Total Loaded Module : ",LoadedModuleName.length, "  =>  'getLoadedModules' for Detail");
      msg    += fort("");
      msg    += fort("Total Failed Module : ",FailedModuleName.length, "  =>  'getFailedModules' for Detail");
      msg    += fort("");
      msg    += fort("Type 'devHelp()' for more Information");
      msg    += fort("");
      msg    += "#################################################################################";
      console.log(msg);
    }
    unsafeWindow.helpCondition = () => {
        let msg = "\n#############################[ Check Condition Help ]############################\n";
        msg    += fort("");
        msg    += fort("  =>  example 1 using CTX : ");
        msg    += fort("        checkCondition('ctx.selected != null');");
        msg    += fort("");
        msg    += fort("  =>  example 2 using data : ");
        msg    += fort("        checkCondition('data.object_name != null',DOCELEMENT);");
        msg    += fort("");
        msg    += fort("  =>  example 2 using Json : ");
        msg    += fort("        checkCondition({");
        msg    += fort("          \"$source\": \"ctx.mselected\",");
        msg    += fort("          \"$query\": {");
        msg    += fort("            \"$all\": {");
        msg    += fort("              \"$source\": \"modelType.typeHierarchyArray\",");
        msg    += fort("              \"$query\": {");
        msg    += fort("                \"$in\": [");
        msg    += fort("                  \"Wbs0ElementCondElement\"");
        msg    += fort("                ]");
        msg    += fort("              }");
        msg    += fort("            }");
        msg    += fort("          }");
        msg    += fort("        }");
        msg    += fort("      );");
        msg    += fort("");
        msg    += "#################################################################################";
        console.log(msg);
    }
    unsafeWindow.devHelp = () => {
      let msg = "\n################################[ DevTool Help ]#################################\n";
      msg    += fort("");
      msg    += fort("If want to add module that you want to use in dev console");
      msg    += fort("pls add deps on kit.json");
      msg    += fort("");
      msg    += "#################################################################################\n";
      msg    += fort("");
      msg    += fort("getObj(uids)          =>  Get objects from uid or array of uid");
      msg    += fort("getProps(uids,props)  =>  Load propertie(s) from uid,prop string");
      msg    += fort("getData(elements)     =>  Get data(viewModel) from element(s)");
      msg    += fort("getDoc(query)         =>  Get element(s) from document query");
      msg    += fort("q(query)              =>  Single select document query");
      msg    += fort("checkCondition(expression,dataElement = null) => Check helpCondition()")
      msg    += fort("");
      msg    += "#################################################################################";
      console.log(msg);
    }

	function htmlToElement(html) {
		var template = document.createElement('template');
		html = html.trim();
		template.innerHTML = html;
		return template.content.firstChild;
	}

	const popup = htmlToElement(`
    <div id="devtools_overlay_main">
<div id="devtools_objView">
</div>
</div>
    `);

    const popupStyle = document.createElement('style');
    popupStyle.textContent = `
		#devtools_overlay_main {
  position: fixed; /* Sit on top of the page content */
  display: none; /* Hidden by default */
  width: 100%; /* Full width (cover the whole page) */
  height: 100%; /* Full height (cover the whole page) */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.7); /* Black background with opacity */
  z-index: 1000; /* Specify a stack order in case you're using a different order for other elements */
  cursor: pointer; /* Add a pointer on hover */
}


#devtools_exitBtn{
  z-index: 10;
  position: fixed;
  top:0px;
  right:5px;
  border-radius: 25px;
  background-color: rgba(255,0,0,0.2);
  border: 3px;
  width: 25px;
  height: 25px;
  transition: background-color .5s;
}

#devtools_exitBtn:hover {
  background-color: rgba(254, 20, 20, 0.6);
}

#devtools_objView{
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  transform: translate(-50%,-50%);
  min-width: 300px;
  width: auto;
  height: auto;
  border-radius: 14px;
  z-index: 2000;
  background: white;
  cursor: auto;
}

#devtools_objView *{
  margin-top: 5px;
  margin-bottom: 5px;
  color:black;
}

.devtools_elements{
  margin-left: 15px;
  margin-right: 10px;
}

.devtools_propName{
  -webkit-user-select: none;
}

#devtools_objView h2{
  margin-top: 10px;
  margin-left: 20px;
  margin-right: 45px;
  margin-bottom: 10px;
  text-align: center;
}
    `;


	document.body.appendChild(popup);

	popup.appendChild(popupStyle);
    

    let mouseX = 0;
    let mouseY = 0;
    let validateUid = (obj) => {
        if(obj.uid.indexOf("SR::") > -1){
            let splitedText = obj.uid.split("+");
            return unsafeWindow.getObj(splitedText[splitedText.length -1]);
        }else{
            return obj;
        }
    }
    let searchScope = (elem) => {
        let scope = unsafeWindow.angular.element(elem).scope();
        let foundScope = null;
        if(scope){
            scope.obj = null;
            foundScope = scope;
            if(elem.href){
                scope.obj = validateUid(unsafeWindow.getObj(elem.href.split(`uid=`)[1]));
                return scope;
            }else{
                if(scope.vmo){
                    scope.obj = validateUid(scope.vmo);
                    return scope;
                }
                if(scope.$$childTail.prop){
                    scope.obj = validateUid(unsafeWindow.getObj(scope.$$childTail.prop.intermediateObjectUids ? scope.$$childTail.prop.intermediateObjectUids[0] : scope.$$childTail.prop.dbValue));
                    return scope;
                }
                if(scope.prop){
                    scope.obj = validateUid(unsafeWindow.getObj(scope.prop.intermediateObjectUids ? scope.prop.intermediateObjectUids[0] : scope.prop.dbValue));
                    return scope;
                }else{
                    foundScope = searchScope(scope.$parent);
                }
            }
        }
        return foundScope;
    }

    function doc_keyUp(e) {
        switch (e.keyCode) {
            case 17:
                let elem = unsafeWindow.document.elementFromPoint(mouseX, mouseY);
                let scope = searchScope(elem);
                if(scope && scope?.obj && scope?.obj != null){
                    popup.style.display = "block";
                    let objView = popup.querySelector(`div[id="devtools_objView"]`);
                    while(objView.lastElementChild){
                        objView.removeChild(objView.lastElementChild);
                    }
                    objView.appendChild(htmlToElement(`
                        <div><input id="devtools_exitBtn" type="BUTTON" value="X" /></div>
                    `));
                    document.getElementById("devtools_exitBtn").onclick = () =>{
                        popup.style.display = "none";
                        scope.obj = null;
                    };

                    const objTitle = htmlToElement(`
                        <div><h2>${scope.obj.props.object_name? scope.obj.props.object_name.dbValue ? scope.obj.props.object_name.dbValue : scope.obj.props.object_name.dbValues[0] : scope.obj.props.object_string.dbValue ? scope.obj.props.object_string.dbValue : scope.obj.props.object_string.dbValues[0]}</h2><hr/></div>
                    `);
                    const uidElement = htmlToElement(`
                        <div><span class="devtools_elements devtools_propName">UID:</span><span class="devtools_propText">${scope.obj.uid}</span><p></p></div>
                    `);
                    objView.appendChild(objTitle);
                    objView.appendChild(uidElement);
                }
                unsafeWindow.console.log(scope);
                scope = null;
                break;
            default:
                break;
        }
    }
    document.addEventListener('keyup', doc_keyUp, false);
    document.onmousemove = (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    }

    loadSuccess();
})();
