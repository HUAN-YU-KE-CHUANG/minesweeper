const {
  MineCell,
  CellDisplayType
} = require('../../../utils/MineCell')

const {
  getRandomNums
} = require('../../../utils/util')

const innerAudioContext = wx.createInnerAudioContext()

// 结束时获取随机提示消息内容
const Message = {
  __success: ['没办法，IQ太高了。', '小小扫雷，直接拿捏！', '真正聪明的人，运气总不会太差~'],
  __hit: ['失败是成功之母', '中奖啦！！！', '多玩几次，总能过关的'],
  __mistake: ['啊？！', '遗憾，CPU干烧了', '这次一定是手滑了'],
  getMsg: function (fail, hit) {
    let index = Math.floor(Math.random() * 3)
    return (fail ? (hit ? this.__hit[index] : this.__mistake[index]) : this.__success[index])
  }
}

Page({
  data: {
    cells: [],
    rowCount: 14,
    colCount: 11,
    mineCount: 25,
    marked: 0,
    finished: false,
    surplus: 0,
    clickHandler: null,
    isTurning: false,
    bgm: false,
    playing: null,
  },

  //事件处理函数
  // 翻开
  turnOver: function () {
    if (this.data.finished) return

    this.setData({
      isTurning: true
    })

    this.data.clickHandler = (x, y) => {
      let cells = this.data.cells
      let cell = cells[y][x]

      // cannot click if is marked
      if (cell.cellDisplayType === CellDisplayType.FLAG) {
        return
      }

      if (cell.isMine) {
        cell.cellDisplayType = CellDisplayType.EXPLOSION
        this.finish(cells, true)
      } else if (cell.minesAroundCount > 0) {
        cell.cellDisplayType = CellDisplayType.NUMBER;
      } else {
        cell.cellDisplayType = CellDisplayType.EMPTY;
        this.extend(cell)
      }

      this.setData({
        cells,
      })
    }
  },

  // 标记
  toggleMark: function () {
    if (this.data.finished) return

    this.setData({
      isTurning: false
    })

    this.data.clickHandler = (x, y) => {
      let cells = this.data.cells
      let marked = this.data.marked
      let cell = this.data.cells[y][x]

      if (cell.cellDisplayType === CellDisplayType.INIT) {
        cell.cellDisplayType = CellDisplayType.FLAG
        marked += 1
      } else {
        cell.cellDisplayType = CellDisplayType.INIT
        marked -= 1
      }
      this.data.marked = marked

      if (marked === this.data.mineCount) this.finish(this.data.cells)

      this.setData({
        cells,
        surplus: this.data.mineCount - marked,
      })
    }
  },

  // 重置
  restart: function () {
    this.data.finished = false
    this.resetGame({
      colCount: this.data.colCount,
      rowCount: this.data.rowCount,
      mineCount: this.data.mineCount,
    })
  },

  // 点击雷区单元格
  onCellClick: function (e) {
    if (this.data.finished) return
    let {
      coordinateX: x,
      coordinateY: y
    } = e.target.dataset

    this.data.clickHandler(x, y)
  },

  // 继续翻开更多
  extend(cell) {
    let colCount = this.data.colCount
    let rowCount = this.data.rowCount

    let x = cell.x
    let y = cell.y

    for (let i = x - 1; i <= x + 1; i++) {
      let cellTemp
      for (let j = y - 1; j <= y + 1; j++) {
        if (i < 0 ||
          j < 0 ||
          (i === x && j === y) ||
          i >= colCount ||
          j >= rowCount) {
          continue
        }

        cellTemp = this.data.cells[j][i]
        if (cellTemp.cellDisplayType !== CellDisplayType.INIT) continue

        if (cellTemp.minesAroundCount === 0) {
          cellTemp.cellDisplayType = CellDisplayType.EMPTY;
          this.extend(cellTemp)
        } else {
          cellTemp.cellDisplayType = CellDisplayType.NUMBER;
        }
      }
    }
  },

  // 结束
  finish(cells, failed) {
    this.data.finished = true
    this.data.marked = 0
    let fail = failed

    for (let y = 0; y < this.data.rowCount; y++) {
      for (let x = 0; x < this.data.colCount; x++) {
        let cell = cells[y][x]
        cell.finish()
        if (fail === false &&
          cell.cellDisplayType === CellDisplayType.FLAG && !cell.isMine ||
          cell.cellDisplayType !== CellDisplayType.FLAG && cell.isMine) {
          fail = true
        }
      }
    }

    wx.showModal({
      title: fail ? '挑战失败！' : '恭喜胜利！',
      showCancel: false,
      content: Message.getMsg(fail, failed)
    })
  },

  // 计算雷区信息
  counting(cell) {
    let colCount = this.data.colCount
    let rowCount = this.data.rowCount

    let x = cell.x
    let y = cell.y

    for (let i = x - 1; i <= x + 1; i++) {
      let cellTemp
      for (let j = y - 1; j <= y + 1; j++) {
        if (i < 0 ||
          j < 0 ||
          i >= colCount ||
          j >= rowCount) {
          continue
        }

        cellTemp = this.data.cells[j][i]

        if (!cellTemp.isMine) {
          cellTemp.minesAroundCount += 1
        }
      }
    }
  },

  // 页面启动
  onLoad: function (options) {
    const LevelConfig = { //设置格子数量、难度
      simple: {
        colCount: 9,
        rowCount: 9,
        mineCount: 10,
      },
      difficult: {
        colCount: 10,
        rowCount: 12,
        mineCount: 20,
      },
      terrible: {
        colCount: 11,
        rowCount: 13,
        mineCount: 30,
      },
      // epic:{
      //   colCount: 11,
      //   rowCount: 14,
      //   mineCount: 40,
      // },
      // legend:{
      //   colCount: 12,
      //   rowCount: 15,
      //   mineCount: 50,
      // },
      // mythology:{
      //   colCount: 12,
      //   rowCount: 15,
      //   mineCount: 60,
      // }
    }
    this.resetGame(LevelConfig[options.level])
    this.data.bgm = !wx.getStorageSync("bgm")
  },

  onReady: function () {
    innerAudioContext.autoplay = true
    innerAudioContext.loop = true
    innerAudioContext.src = 'http://hykc.continuedev.cloud/Audio/蒋小呢 - 给你呀（for ya）.mp3'
    this.bgmToogle()
  },

  onUnload: function () {
    innerAudioContext.stop()
    //innerAudioContext.destroy()
    wx.setStorageSync('bgm', this.data.bgm)
  },

  __playMusicAnimation() {
    this.animate('.music-img', [{
        rotate: 0,
      },
      {
        rotate: 90,
      },
      {
        rotate: 180,
      },
      {
        rotate: 270,
      },
      {
        rotate: 360,
      },
    ], 2000)
  },

  bgmToogle() {
    this.data.bgm = !this.data.bgm

    // start music and animation
    if (this.data.bgm) {
      this.__playMusicAnimation()
      // to play in a loop, use setInterval
      let playing = setInterval(() => {
        this.__playMusicAnimation()
      }, 2000)
      this.setData({
        playing
      })

      innerAudioContext.play()
    }
    // pause/stop music and animation
    else {
      this.clearAnimation('.music-img')
      clearInterval(this.data.playing)
      this.setData({
        playing: null
      })

      innerAudioContext.pause()
    }
  },

  // 重置当前游戏
  resetGame(levelConfig) {
    let colCount = this.data.colCount = levelConfig.colCount
    let rowCount = this.data.rowCount = levelConfig.rowCount
    let mineCount = this.data.mineCount = levelConfig.mineCount

    let cellsArr = []
    let minesArr = []

    let mineNums = getRandomNums(0, colCount * rowCount - 1, mineCount)

    for (let y = 0; y < rowCount; y++) {
      let row = []
      for (let x = 0; x < colCount; x++) {
        const isMine = mineNums.includes(this.data.colCount * y + x)
        const cell = new MineCell(x, y, isMine)
        row.push(cell)
        isMine && minesArr.push(cell)
      }
      cellsArr.push(row)
    }

    this.data.marked = 0
    this.setData({
      cells: cellsArr,
      surplus: mineCount,
      isTurning: true,
    })

    this.turnOver()

    minesArr.forEach(cell => {
      this.counting(cell)
    })
  },
  onShareAppMessage: function () {
    return {
      title: '扫雷',
      path: '/pages/mine_clearance/chooseLevel/chooseLevel.js'
    }
  }
})