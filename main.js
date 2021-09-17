const { app, BrowserWindow } = require('electron')
const path = require('path')

console.log("Hello")

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    nodeIntegration: true,
    //https://www.flaticon.com/free-icon/solar-system_167323
    icon: path.join(__dirname, 'solar-system-icon.png')
  })
  
  // win.removeMenu()

  win.loadFile('./index.html')
}


app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

