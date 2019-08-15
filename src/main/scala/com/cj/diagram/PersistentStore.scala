package us.penrose.diagram

trait PersistentStore[T] {
  def load(key:String):T
  def store(key:String, t:T)
}
