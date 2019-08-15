package us.penrose.diagram

import java.io.File

class JacksonFilesPersistentStore[T](clazz:Class[T], dataDir:File) extends PersistentStore[T](){
    
    /** TODO: INJECTION SECURITY RISK **/
    private def file(key:String) = new File(dataDir, key + ".json");
    
    def load(key:String) = {
       Jackson.mapper.readValue(file(key), clazz)
    }
    
    def store(key:String, data:T) = {
        Jackson.mapper.writer.withDefaultPrettyPrinter().writeValue(file(key), data)
    }
}
