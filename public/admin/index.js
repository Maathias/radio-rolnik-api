class Element{
  constructor() {
    
  }

  el(){

  }
}

var Socket

window.onload = function () {
  Socket = io(`/admin`, {
    autoConnect: true
  })
}
