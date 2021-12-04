const request = require("request")
const http = require("http")
var _ = require("lodash")

const hostname = "127.0.0.1"
const port = 3000

const dataUrl = "https://s3-eu-west-1.amazonaws.com/yoco-testing/tests.json"

const highValues = {
  10: { value: 10, char: "10", rankValue: 0 },
  J: { value: 10, char: "J", rankValue: 1 },
  Q: { value: 10, char: "Q", rankValue: 2 },
  K: { value: 10, char: "K", rankValue: 3 },
  A: { value: 11, char: "A", rankValue: 4 }
}

const suiteRank = {
  S: { rankValue: 4, char: "S" },
  H: { rankValue: 3, char: "H" },
  C: { rankValue: 2, char: "C" },
  D: { rankValue: 1, char: "D" }
}

const targetValue = 21

const serve = data => {
  const server = http.createServer((req, res) => {
    res.statusCode = 200
    res.setHeader("Content-Type", "text/plain")
    res.end(data)
  })

  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`)
  })
}

const simpleRequest = url => {
  request(url, { json: true }, (err, res, body) => {
    if (err) {
      return console.log(err)
    }
    processData(body)
  })
}

simpleRequest(dataUrl)

const processData = data => {
  const result = _.reduce(data, checkPlayerAWin, [])
  console.log(result)
  console.log(_.size(result) + " failures out of " + _.size(data))
  serve(JSON.stringify(result))
}

const checkPlayerAWin = (result, item) => {
  let playerAWins = false
  const aHand = item && item.playerA
  const bHand = item && item.playerB

  const aHandValue = getHandValue(aHand)
  const bHandValue = getHandValue(bHand)

  // checks if player A wins via 21 bounds
  if (!playerAWins) {
    playerAWins = check21LimitWin(aHandValue, bHandValue)
  }

  // checks if player A wins via hand value
  if (!playerAWins) {
    playerAWins = checkHandValueWin(aHandValue, bHandValue)
  }

  // if tied score checks player A wins by highest card
  if (!playerAWins && aHandValue == bHandValue) {
    playerAWins = checkTiedHighestCardWin(aHand.slice(), bHand.slice())
  }

  // if hands are identical other than suite, checks whether player A wins via suite of highest card
  if (
    !playerAWins &&
    aHandValue == bHandValue &&
    _.size(aHand) == _.size(bHand)
  ) {
    playerAWins = checkIdenticalHandSuiteWin(aHand, bHand)
  }

  // checks if player A loses via 21 bounds
  if (playerAWins) {
    playerAWins = !check21LimitLoss(aHandValue)
  }

  if (playerAWins != item.playerAWins) {
    result.push(item)
    return result
  }
  return result
}

const check21LimitLoss = aHandValue => {
  return aHandValue > targetValue
}

const check21LimitWin = (aHandValue, bHandValue) => {
  return aHandValue <= targetValue && bHandValue > targetValue
}

const checkHandValueWin = (aHandValue, bHandValue) => {
  return !check21LimitLoss(aHandValue) && aHandValue > bHandValue
}

const checkTiedHighestCardWin = (aHand, bHand) => {
  const aHighestCard = getHighestCard(aHand)
  const bHighestCard = getHighestCard(bHand)

  const aHighestCardValue = parseInt(aHighestCard.value)
  const bHighestCardValue = parseInt(bHighestCard.value)

  if (aHighestCardValue > bHighestCardValue) {
    return true
  } else if (aHighestCardValue < bHighestCardValue) {
    return false
  } else if (
    aHighestCardValue == bHighestCardValue &&
    aHighestCardValue == 10
  ) {
    return isAHighCardTypeGreater(
      aHighestCard.cardFaceChar,
      bHighestCard.cardFaceChar
    )
  } else if (_.size(aHand) <= 0) {
    return false
  } else {
    aHand = removeCardFromHand(aHighestCard.card, aHand)
    bHand = removeCardFromHand(bHighestCard.card, bHand)
    return checkTiedHighestCardWin(aHand, bHand)
  }
}

const removeCardFromHand = (cardToRemove, hand) => {
  return _.remove(hand, card => {
    return card != cardToRemove
  })
}

const checkIdenticalHandSuiteWin = (aHand, bHand) => {
  const aHighestCard = getHighestCard(aHand)
  const bHighestCard = getHighestCard(bHand)

  return isCardASuiteGreater(
    getCardSuite(aHighestCard.card),
    getCardSuite(bHighestCard.card)
  )
}

const getHighestCard = hand => {
  return _.reduce(
    hand,
    (sum, card) => {
      cardAObject = {
        cardSuite: getCardSuite(card),
        value: parseInt(getCardValue(card)),
        cardFaceChar: getFaceCardChar(card),
        card: card
      }
      if (isCardAHigher(cardAObject, sum)) {
        return cardAObject
      }
      return sum
    },
    { cardSuite: "", value: 0, card: "", faceChar: "" }
  )
}

const getHandValue = hand => {
  return _.reduce(
    hand,
    function(sum, item) {
      return sum + parseInt(getCardValue(item))
    },
    0
  )
}

const getCardValue = card => {
  const splitCardValues = _.split(card, "")

  // get 10 and less values
  let numericValue = _.reduce(
    splitCardValues,
    (sum, item) => {
      if (isNumericChar(item)) return sum + item
      return sum
    },
    ""
  )

  // get high values
  if (_.isEmpty(numericValue)) {
    switch (splitCardValues[0]) {
      case highValues.J.char:
        numericValue = highValues.J.value
        break
      case highValues.Q.char:
        numericValue = highValues.Q.value
        break
      case highValues.K.char:
        numericValue = highValues.K.value
        break
      case highValues.A.char:
        numericValue = highValues.A.value
        break
      default:
        // todo report bug
        break
    }
  }

  return numericValue
}

const getFaceCardChar = card => {
  let splitCardValues = _.split(card, "")
  splitCardValues.pop()
  return _.join(splitCardValues)
}

const isCardAHigher = (cardAObject, cardBObject) => {
  if (cardAObject.value > cardBObject.value) return true

  if (cardAObject.value == cardBObject.value) {
    if (
      isAHighCardTypeGreater(cardAObject.cardFaceChar, cardBObject.cardFaceChar)
    ) {
      return true
    } else if (
      isCardASuiteGreater(cardAObject.cardSuite, cardBObject.cardSuite)
    ) {
      return true
    }
  }

  return false
}

const isAHighCardTypeGreater = (cardTypeA, cardTypeB) => {
  return (
    getHighCardTypeRankValue(cardTypeA) > getHighCardTypeRankValue(cardTypeB)
  )
}

const isCardASuiteGreater = (cardSuiteA, cardSuiteB) => {
  return getCardSuiteRankValue(cardSuiteA) > getCardSuiteRankValue(cardSuiteB)
}

const getHighCardTypeRankValue = cardType => {
  let rankValue = 0
  switch (cardType) {
    case highValues.J.char:
      rankValue = highValues.J.rankValue
      break
    case highValues.Q.char:
      rankValue = highValues.Q.rankValue
      break
    case highValues.K.char:
      rankValue = highValues.K.rankValue
      break
    case highValues.A.char:
      rankValue = highValues.A.rankValue
      break
    default:
      // todo report bug
      break
  }
  return rankValue
}

const getCardSuiteRankValue = cardSuite => {
  let rankValue = 0
  switch (cardSuite) {
    case suiteRank.S.char:
      rankValue = suiteRank.S.rankValue
      break
    case suiteRank.H.char:
      rankValue = suiteRank.H.rankValue
      break
    case suiteRank.C.char:
      rankValue = suiteRank.C.rankValue
      break
    case suiteRank.D.char:
      rankValue = suiteRank.D.rankValue
      break
    default:
      // todo report bug
      break
  }
  return rankValue
}

const getCardSuite = card => {
  const splitCardValues = _.split(card, "")
  return _.last(splitCardValues)
}

const isNumericChar = char => {
  return !isNaN(char)
}
