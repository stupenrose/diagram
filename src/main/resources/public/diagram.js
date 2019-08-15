


function doDiagram(config){

  function hackIdTransform(o){
    // eeeww ... mutation ... need to refactor this entire diagram.js to refer to .id instead of .name
    if(o.id){
      o.displayName = o.name;
      o.name = o.id;
    }else{
      o.id = o.name;
      o.displayName = o.name;
    }

    o.children = _.map(o.children, hackIdTransform);
    return o;
  }

  var misc = _.map(config.objects, hackIdTransform);;
  var connections = config.connections;
  var typeViews = config.typeViews;
  var presentationUrl = config.baseUrl + "/presentation/" + config.diagramName;
  var body = config.root;

  var presentation = {};


  function getParent(name, parent, children){
    if(children){
      //console.log("Descending into ", parent);
      var keepLooking = true;
      var result;


      for(var x=0;x<children.length; x++){
        var child = children[x];
        //console.log("child " + x, "of", parent, "is", child.name)
        if(child.name == name){
          //console.log("Found it");
          result = parent;
          break;
        }else{
          result = getParent(name, child, child.children);

          if(result){
            break;
          }
        }
      }

      return result;
    }
  }

  function itemCoordinates(name){
    var coordinates = itemCoordinatesFull(name, misc,  {x:0,y:0});

    if(!coordinates){
      throw "No item named " + name;
    }

    //console.log(name, " is ", coordinates);
    return coordinates;
  }

  function itemCoordinatesFull(name, items, parentCoords){

      //console.log("looking for ", name, " in ", items, " with parent coords ", parentCoords);

      var item = _.find(items, function(item){return item.name === name;});
      //console.log("item:", item);

      if(!item){ // look in all the children
        //console.log("descending");
        var matches = _.flatten(_.map(items, function(i){
          var pres = presentation[i.name];
          var coords = {
            x:parentCoords.x + pres.x,
            y:parentCoords.y + pres.y
          }
          //console.log("parent coords will be ", coords);
          return itemCoordinatesFull(name, i.children, coords);
        }));

        return _.find(matches, function(i){ if(i) return true; else return false;});
      }else{
        //console.log("parentCoords", parentCoords);
        var pres = presentation[name];
        var coords = {
          x:parentCoords.x + pres.x,
          y:parentCoords.y + pres.y
        }
        return coords;
      }
  }


  var dia_;

  function diagram(){
    if(!dia_){
      dia_ = $("body svg")[0];
    }
    return dia_;
  }

  var pt;
  function diagramCoordinatesForEvent(evt) {
      if(!pt){
        pt = diagram().createSVGPoint();
      }
      pt.x = evt.clientX;
      pt.y = evt.clientY;

      // The cursor point, translated into svg coordinates
      var cursorpt =  pt.matrixTransform(diagram().getScreenCTM().inverse());
      //console.log("(" + cursorpt.x + ", " + cursorpt.y + ")");
      return cursorpt;
  }

  function findDiagramElement(node){
    //console.log(node)
    if(node.id){
      if(node.id.indexOf("connection-from-") === 0){
        return node.id;
      }else{
        var match = _.find(_.pairs(presentation), function(item){
          var name = item[0];
          var pres = item[1];

          var domId = selectorName(name);
          return domId === node.id;
        });
        if(match){
          return match[0];
        }
      }

    }
    var parent = node.parentNode;
    if(parent){
      return findDiagramElement(parent);
    }else{
      return undefined;
    }
  }

  function findDiagramElementForEvent(e){

    var node = document.elementFromPoint(e.clientX, e.clientY);
    //console.log("clicked on node ", node)
    //console.log("done");
    return findDiagramElement(node);
  }

  $.ajax({
   url: presentationUrl,
   method:"GET",
   async:false
  }).done(function( msg ) {
    //console.log( "Data fetched: ", msg );
    presentation = msg;

    // Create some sane default positions for un-positioned items
    _.each(misc, function(name){
      var pres = presentation[name];
      if(!pres){
        pres = {
          x:10,
          y:10,
          width:200,
          height:100
        }
        presentation[name] = pres;
      }
    });
  });

  function saveToServer(){
    $.ajax({
     url: presentationUrl,
     method:"PUT",

     data: JSON.stringify(presentation)
    })
  }



  var handlers = {};

  var draggingName;
  var startEvent;
  var startPos;
  var startSize;


  function addResizeHandlers(selector, presentationName){
    //console.log("Adding resize handlers to ", selector, " for ", presentationName);
    var myHandlers = handlers[selector];
    if(!myHandlers){
      myHandlers = {};
      handlers[selector] = myHandlers;
    }

    var isDown = false;
    var downEvent = null;



    myHandlers.mousedown = function(e){
      console.log("down resize", presentationName);
      if(draggingName && draggingName!=presentationName) return;
      e.preventDefault();
      var view = $(e.target);
      console.log("down resize", selector, view);
      if(!isDown){
        startEvent = e;
        isDown = true;
        draggingName = presentationName;
        downEvent = e;
        var pres = presentation[presentationName];
        startSize = {
          width:pres.width,
          height:pres.height,
          x:pres.x,
          y:pres.y
        }
      }
    };

    $("body").mouseup(function(){
      //console.log("mouseup", service.name);
      if(isDown){
        isDown = false;
        draggingName = undefined;
      }
    });
    $("body").mousemove(function(e){
      if(isDown){
        console.log("move");
        e.preventDefault();
        var pres = presentation[presentationName];
        var dx = -(downEvent.clientX - e.clientX);
        var dy = -(downEvent.clientY - e.clientY);

          console.log("resizing " + presentationName, startSize, dx, dy)
        pres.width = startSize.width + dx;
        pres.height = startSize.height + dy;
        //pres.x = startSize.x - dx;
        //pres.y = startSize.y - dy;
        saveToServer();
        render();
      }
    });
  }

  function addDragHandlers(selector, presentationName){
    var myHandlers = handlers[selector];
    if(!myHandlers){
      myHandlers = {};
      handlers[selector] = myHandlers;
    }

    var isDown = false;
    var downEvent = null;

    myHandlers.mousedown = function(e){
      console.log("down ", selector, view);
      if(draggingName && draggingName!=presentationName) return;
      e.preventDefault();
      var view = $(e.target);
      if(!isDown){
        startEvent = e;
        isDown = true;
        draggingName = presentationName;
        if(!selections.includes(presentationName)){
          console.log("Focusing on " + presentationName + " via drag");
          selections = [presentationName];
        }
        downEvent = e;
        startPos = _.map(selections, function(selection){
          var pres = presentation[selection];
          return {
            id:selection,
            x:pres.x,
            y:pres.y
          };
        });
        console.log(startPos);
      }
    };

    $("body").mouseup(function(){
      //console.log("mouseup", service.name);
      if(isDown){
        isDown = false;
        draggingName = undefined;
        startPos = undefined;
      }
    });
    $("body").mousemove(function(e){
      if(isDown && startPos){
        e.preventDefault();
        _.each(startPos, function(d){
          var presentationName = d.id;
          var startPos = {
            x:d.x,
            y:d.y
          };
          //console.log("Moving " + presentationName)
          var pres = presentation[presentationName];
          var newX = startPos.x - (downEvent.clientX - e.clientX);
          var newY = startPos.y - (downEvent.clientY - e.clientY);

          function ranged(min, val, max){
            if(val < min){
              return min;
            }else if(val > max){
              return max;
            }else{
              return val;
            }
          }


          var parent = getParent(presentationName, undefined, misc);
          var maxX;
          var maxY;
          if(parent){
            var parentPres = presentation[parent.name];
            maxX = parentPres.width - pres.width;
            maxY = parentPres.height - pres.height;
          }else{
            maxX = 6000;
            maxY = 6000;
          }
          pres.x = ranged(0, newX, maxX);
          pres.y = ranged(0, newY, maxY);
        });
        saveToServer();
        render();
      }
    });
  }

  function selectorName(name){
    return name
            .replace(/:/g, "_colon_")
            .replace(/\,/g, "_comma_")
            .replace(/\&/g, "_and_")
            .replace(/\./g, "_dot_")
            .replace(/ /g, "_")
            .replace(/\//g, "_slash_")
            .replace(/\?/g, "_question_")
            .replace(/\+/g, "_plus_")
            .replace(/\)/g, "_ENDPAREN_")
            .replace(/\(/g, "_STARTPAREN_");
  }

  function getParentSvg(node){
    var parent = node.parentNode;
    //console.log('getParentSvg', parent)
    if(parent.tagName === "svg"){
      return parent;
    }else{
      getParentSvg(parent);
    }
  }

  var selections = [];


  $(function(){

    function addHandlersForItem(item){

        addResizeHandlers("#" + selectorName(item.name) + "-grow-handle", item.name);
        addDragHandlers("#" + selectorName(item.name), item.name);

        _.each(item.children, addHandlersForItem);
    }

    _.each(misc, addHandlersForItem);


    function handleDoubleClickOnConnector(e, node){

        var connectionName = node.getAttribute("connection-name");
        console.log("Double clicked on " + connectionName);
        var pres = presentation[connectionName];

        if(!pres.points){
          pres.points = [];
        }

        var points = _.map(node.points, function(i){return i;});
        var segmentEnd = _.min(points, function(point, idx){
          console.log("point")
          if(idx === 0){
            console.log("Start is ", point);
            return "start";// ignored in the min
          }else{
            var prev = node.points[idx-1];
            console.log("Point", (idx - 1), point)
            var distance = distanceToLineSegment(prev.x, prev.y, point.x, point.y, e.clientX, e.clientY)
            console.log("Distance", distance)
            return distance;
          }
        });

        var insertIndex = points.indexOf(segmentEnd) - 1;
        console.log("segment end", segmentEnd, insertIndex);

        pres.points.splice(insertIndex, 0, {x:e.clientX, y:e.clientY});
        e.preventDefault();
        saveToServer();
        render();
    }

    function handleDoubleClickOnConnectorPoint(e, node){
      console.log("on point")
      var connectionName = node.getAttribute("connection-name");
      var pointNum =  parseInt(node.getAttribute("connection-point-num"), 10);
      var pres = presentation[connectionName];
      var points = pres.points;
      foo = points;
      console.log(connectionName, pointNum, typeof pointNum);
      console.log("before", points);
      points.splice(pointNum, 1);
      console.log("after", points);
      e.preventDefault();
      saveToServer();
      render();
    }
    function handleDoubleClick(e){

        console.log("Double clicked");
        var node = document.elementFromPoint(e.clientX, e.clientY);
        if(node.id.indexOf("connection-from-")==0){
          handleDoubleClickOnConnector(e, node);
        }else if(node.id.indexOf("point-connection-from-")==0){
          handleDoubleClickOnConnectorPoint(e, node);
        }
    }

    (function(){

      var lastClick;
      document.addEventListener("click", function(e){
          var now = new Date().getTime();
          if(lastClick && (now-lastClick) < 250){
            handleDoubleClick(e);
          }

          lastClick = now;
      });
    }());

    document.addEventListener("mousedown", function pointDragHandler(e){
      var isDown = false;

      // Drag state
      var draggingName;
      var downEvent;
      var connectionName;
      var pointNum;
      var startSize;

      var node = document.elementFromPoint(e.clientX, e.clientY);
      if(node.id.indexOf("point-connection-from-")==0){
        console.log("Clicked on a point");
        e.preventDefault();
        isDown = true;
        draggingName = node.id;
        downEvent = e;
        connectionName = node.getAttribute("connection-name");
        pointNum =  parseInt(node.getAttribute("connection-point-num"), 10);

        var startSize = {
          x:presentation[connectionName].points[pointNum].x,
          y:presentation[connectionName].points[pointNum].y
        };

        console.log("Starting at ", startSize);
        $("body").mouseup(function(){
          //console.log("mouseup", service.name);
          if(isDown){
            isDown = false;
            draggingName = undefined;
          }
        });
        $("body").mousemove(function(e){
          console.log("Moving");
          if(isDown){
            e.preventDefault();
            var dx = -(downEvent.clientX - e.clientX);
            var dy = -(downEvent.clientY - e.clientY);

            //console.log("resizing " + node.getAttribute("connection-name") + " " + node.getAttribute("connection-point-num"), startSize, dx, dy)
            var pres = presentation[connectionName];
            //console.log(pres, pointNum, typeof pointNum)
            pres.points[pointNum].x = startSize.x + dx;
            pres.points[pointNum].y = startSize.y + dy;
            saveToServer();
            render();
          }
        });
      }
    });

    document.addEventListener("click",function(e){
      if(draggingName) return;
            var node = document.elementFromPoint(e.clientX, e.clientY);
      var match = findDiagramElementForEvent(e);

      if(match){
        e.preventDefault();
        console.log("document click", e, match);
        if(e.shiftKey){
          if(!selections.includes(match)){
            selections.push(match);
          }
        }else{
          selections = [match];
        }
      }else if(node.id.indexOf("point-connection-from-")==0){
        console.log("do nothing");
      }else{
          console.log("No match");
          selections = [];

      }
      render();

      return;
    });

    render();
  });


  function addHandlers(canvas){
    //console.log("Adding handlers to #", canvas.attr("id"))
    if(!canvas){
      canvas = $("svg");
    }

    $.each(handlers, function(idx, myHandlers){
      function foo(view){
        if(view){

                    //console.log("Found", view, " on ", canvas)
                    $.each(myHandlers, function(attribute, value){
                      $(view).on(attribute, value);
                    });
        }

      }
      foo(canvas.find(idx)[0]);
      foo(canvas.filter(idx)[0]);
    });
  }

  var previousPresentation = [];

  function render(){
      //console.log("Render");



      function renderItem(item, where, force){

          var id = selectorName(item.name);
          var prev = previousPresentation[item.name];
          var current = presentation[item.name];

          if(current){

            if(current.x<0){
              current.x = 0;
            }
            if(current.y<0){
              current.y = 0;
            }
          }


          var changed = (prev && current && (
              prev.x != current.x ||
              prev.y != current.y ||
              prev.width != current.width ||
              prev.height!= current.height));
          if(force || !prev || changed){

              //console.log("Rendering ", item, " to ", where)
              where.find("#" + id).remove();


              var pres = presentation[item.name];
              if(!pres){
                pres = {x:10, y:10, width:40, height:40};
                presentation[item.name] = pres;
              }
              var viewFn = typeViews[item.type];
              if(typeof viewFn === "string"){
                viewFn = staticSvg(viewFn);
              }

              //console.log(svg);
              var id = selectorName(item.name);
              var svg = viewFn(item.displayName, id, pres, item.type);

              //console.log("Rendered " + id);
              _.each(item.children, function(child){
                renderItem(child, svg, true);
              });

              addHandlers(svg);
              where.append(svg);
          }else{
            var me = where.find("#" + id);
            _.each(item.children, function(child){
              renderItem(child, me);
            });
          }
         previousPresentation[item.name] =  Object.assign({}, current);;

      }


      _.each(misc, function(item){
        renderItem(item, body);
      });

      body.find(".server-connection").remove();
      body.find(".connection-point").remove();

      _.each(connections, function(connection){
        var name = connection.start + "====>>>" + connection.end;
        var connectionId = "connection-from-" + selectorName(connection.start) + "-to-" + selectorName(connection.end);
        var pres = presentation[name];
        if(!pres){
          pres = {};
          presentation[name] = pres;
        }
        var start = connection.start;
        var end = connection.end;

        var aCoords = itemCoordinates(start);
        var bCoords = itemCoordinates(end);


        var points = "";


        function addPoint(x, y){
          points += x + "," + y + " ";
        }



        addPoint(aCoords.x + (presentation[start].width/2), aCoords.y + (presentation[start].height/2));

        if(pres.points){
          _.each(pres.points, function(point, idx){
            addPoint(point.x, point.y);
          });
        }

        addPoint(bCoords.x + (presentation[end].width/2), bCoords.y + (presentation[end].height/2));

        var line = svg("polyline", {
            id:connectionId,
            class:"server-connection",
            "connection-name":name,
            points:points,
            "stroke-linejoin":"round",
            "stroke-width":"10"
        });
        body.append(line);


        if(pres.points){

          function addPointDecorator(x, y, n){
            var pointDecorator = svg("circle", {
              id:"point-" + connectionId + "-" + n,
              class:"connection-point point-" + connectionId,
              "connection-name":name,
              "connection-point-num":n,
              cx:x,
              cy:y,
              r:1,
              fill:"none"
            });

            pointDecorator.onclick = function(){
              console.log("clicked");
            }

            body.append(pointDecorator);
          }

          _.each(pres.points, function(point, idx){
            addPointDecorator(point.x, point.y, idx);
          });
        }

        line.onclick = function(){
          console.log("line clicked")
        };
      });

      body.find(".drag-box").remove();

      console.log("Selections", selections);
      _.each(selections, showSelected);

      //function showSelectedLine()
      function showSelected(selection){
        if(selection.indexOf("connection-from-") == 0){
          console.log("Connection selected");
          var s = $("#" + selection);
          foo = s;
          s.addClass("selected-connection")
          s[0].classList.add("selected-connection");
          s.attr("class", s.attr("class") + " selected-connection")
          s.attr("foo", s.attr("class") + " selected-connection")
          console.log($("#" + selection))
          $(".point-" + selection).addClass("selected-point");

          return;
        }
        //console.log("Selection is " + selection);
        var targetSelector = "#" + selectorName(selection);
        var id = selection;
        var pres = presentation[id];


        var targets = body.find(targetSelector);
        //console.log("Found", targets.length, " targets for " + targetSelector);
        var target = targets[0];
        //console.log("Selection (" + targetSelector + ")", target);
        var parentSvg = getParentSvg(target);
        //console.log("parent ", parentSvg);

        var svgTag = customSvg(config.baseUrl + "/drag-box.svg", {
            class:"drag-box",
            x:pres.x,
            y:pres.y,
            width:pres.width,
            height:pres.height,

            ".drag-box-outline":{
              width:pres.width-10,
              height:pres.height-10
            },

            ".top-right-grow-handle":{
              x: pres.width - 15
            },

            ".bottom-left-grow-handle":{
              y: pres.height - 15
            },

            ".bottom-right-grow-handle":{
              y: pres.height - 15,
              x: pres.width - 15
            }
        });

        svgTag.find(".grow-handle")
               .attr("id", selectorName(selection) + "-grow-handle");



        svgTag.appendTo(parentSvg);

        addResizeHandlers("#" + selectorName(selection) + "-grow-handle", selection);
        addHandlers(svgTag);
      }


  }



}
