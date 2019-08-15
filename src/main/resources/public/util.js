
function queryMap(){
  var query = window.location.search

  if(query){
    var segments = query.substr(1).split("&")
    var result = {};

    _.each(segments, function(seg){
      var d = seg.split("=");
      result[d[0]] = d[1];
    });
    return result;
  }else{
    return {};
  }
}

function get(url){
  var data = "";

  $.ajax({
      url: url,
      async:false,
      dataType:"text",
      success: function(result){
        data = result;
      }
  });

  return data;
}


function customSvg(filename, customizations){

  var svgDoc = $.parseXML( get(filename) );
  var svgTag = $(svgDoc).find("svg");

  function isObject(obj){
    return typeof obj === "object" && obj !== null;
  }

  function applyAttributes(target, attributes){
    _.each(attributes, function(value, key){
      if(isObject(value)){
        applyAttributes(target.find(key), value);
      }else{
        target.attr(key, value);
      }
    });
  }

  applyAttributes(svgTag, customizations);

  return svgTag;
}


function svg(name, attributes, children){
  var node = $(document.createElementNS("http://www.w3.org/2000/svg",name)).attr(attributes).text(attributes.text);

  if(Array.isArray(children)){
    $.each(children, function(idx, child){
      node.append(child);
    });
  }else{
    node.append(children);
  }
  return node;
}
