"use strict";require("../base/unit.js");require("./event_info.js");require("./event_set.js");require("./timed_event.js");'use strict';global.tr.exportTo('tr.model',function(){function Alert(info,start,opt_associatedEvents,opt_args){tr.model.TimedEvent.call(this,start);this.info=info;this.args=opt_args||{};this.associatedEvents=new tr.model.EventSet(opt_associatedEvents);this.associatedEvents.forEach(function(event){event.addAssociatedAlert(this);},this);}Alert.prototype={__proto__:tr.model.TimedEvent.prototype,get title(){return this.info.title;},get colorId(){return this.info.colorId;},get userFriendlyName(){return'Alert '+this.title+' at '+tr.b.Unit.byName.timeStampInMs.format(this.start);}};tr.model.EventRegistry.register(Alert,{name:'alert',pluralName:'alerts'});return{Alert:Alert};});