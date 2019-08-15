package us.penrose.diagram

import org.httpobjects.jetty.HttpObjectsJettyHandler
import org.httpobjects._
import org.httpobjects.DSL._
import org.httpobjects.util.HttpObjectUtil
import org.httpobjects.util.FilesystemResourcesObject
import java.io.File
import java.net.URLDecoder
import scala.annotation.migration
import java.util.regex.Pattern
import java.io.FileInputStream
import org.httpobjects.header.GenericHeaderField
import org.apache.commons.io.IOUtils
import org.httpobjects.util.ClasspathResourceObject

case class Presentation(x:Int, y:Int, width:Int, height:Int)

object DiagramServer extends App {
  
  val dataPath = new File(args match {
    case Array(path) => path
    case _ => "data"
  })
  
  type Data = Map[String, Presentation]

  val persistence:PersistentStore[Data] = new JacksonFilesPersistentStore(classOf[Data], dataPath);
  
  val allowCrossOriginRequests = new GenericHeaderField("Access-Control-Allow-Origin", "*")
  
  val presentationDataResource = new HttpObject("/presentation/{diagramName}"){
    override def put(req:Request) = {
      val diagramName = URLDecoder.decode(req.path().valueFor("diagramName"))
      val json = HttpObjectUtil.toAscii(req.representation())
      val presentation = Jackson.mapper.readValue(json, classOf[Data])
      persistence.store(diagramName, presentation)
      get(req)
    }
    override def get(req:Request) = {
      
      val diagramName = URLDecoder.decode(req.path().valueFor("diagramName"))
      OK(Json(Jackson.mapper.writer.withDefaultPrettyPrinter().writeValueAsString(persistence.load(diagramName))), allowCrossOriginRequests)
    }
  }  
  
  val singleJavascriptFile = new HttpObject("/diagram.js"){
    override def get(req:Request) = {
      val files = Seq(
              "util.js",
              "distance-to-line-segment.js", 
              "diagram.js")
      
      val result = files.flatMap{filename=>
          val text = IOUtils.toString(getClass.getResourceAsStream(s"/public/$filename"))
          Seq(s"//##########${filename}#############", text)
      }.mkString("\n\n\n\n")
      
      OK(Bytes("text/javascript", result.getBytes))
    }
  }
  
  
  class AllowedAnywhereHttpObjectWrapper(wrapped:HttpObject) extends HttpObject(wrapped.pattern()){
    private def wrap(r:Response) = {
      if(r==null) null
      else new Response(r.code(), r.representation(), (Option(r.header()).getOrElse(Array()) :+ allowCrossOriginRequests) :_* )
    }
    
    override def get(req:Request) =  wrap(wrapped.get(req))
    override def post(req:Request) =  wrap(wrapped.post(req))
    override def put(req:Request) =  wrap(wrapped.put(req))
    override def delete(req:Request) =  wrap(wrapped.delete(req))
    override def options(req:Request) =  wrap(wrapped.options(req))
  }
  
  val resources = Seq(
      singleJavascriptFile,
      new ClasspathResourceObject("/", "/public/index.html", getClass),
      classpathResourcesAt("/public").loadedVia(getClass).servedAt("/"),
      presentationDataResource)

  HttpObjectsJettyHandler.launchServer(9292, 
      resources.map(new AllowedAnywhereHttpObjectWrapper(_)) :_* )
  
  
}
