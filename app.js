const request = require("request")
const http = require("http")
var _ = require("lodash")

const hostname = "127.0.0.1"
const port = 3000

const dataUrl = "https://s3-eu-west-1.amazonaws.com/yoco-testing/tests.json"

const highValues = {
  J: { value: 10, char: "J" },
  Q: { value: 10, char: "Q" },
  K: { value: 10, char: "K" },
  A: { value: 11, char: "A" }
}

const suiteRank = {
  S: { value: 4, char: "S" },
  H: { value: 3, char: "H" },
  C: { value: 2, char: "C" },
  D: { value: 1, char: "D" }
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

    // serve(JSON.stringify(body))
    processData(body)
  })
}

simpleRequest(dataUrl)

const processData = data => {
  const result = _.map(data, checkPlayerOneWin)
  // serve(JSON.stringify(result))
}

const checkPlayerOneWin = item => {
  let playerAWins = false
  const aHand = item && item.playerA
  const bHand = item && item.playerB

  const aHandValue = getHandValue(aHand)
  const bHandValue = getHandValue(bHand)

  // checks if player A wins via 21 bounds
  playerAWins = check21LimitWin(aHandValue, bHandValue)
  if (playerAWins) return playerAWins

  // checks if player A wins via hand value
  playerAWins = checkHandValueWin(aHandValue, bHandValue)
  if (playerAWins) return playerAWins

  // if tied score checks player A wins by highest card
  playerAWins = checkHighestCardWin(aHand, bHand)

  // if hands are identical other than suite, checks whether player A wins via suite of highest card

  return playerAWins
}

const check21LimitWin = (aHandValue, bHandValue) => {
  return aHandValue <= targetValue && bHandValue > targetValue
}

const checkHandValueWin = (aHandValue, bHandValue) => {
  return aHandValue <= 21 && bHandValue <= 21 && aHandValue > bHandValue
}

const checkHighestCardWin = (aHand, bHand) => {
  console.log(aHand)
  const aHighestCard = getHighestCard(aHand)
  const bHighestCard = getHighestCard(bHand)
  if (
    isCardAHigher(
      aHighestCard.value,
      bHighestCard.value,
      aHighestCard.suite,
      bHighestCard.suite
    )
  ) {
    return true
  } else {
    // if a hand does not contain value return false
    // else
    // remove highest card from hand and test again
  }
}

const getHighestCard = hand => {
  return _.reduce(
    hand,
    (sum, card) => {
      cardValue = getCardValue(card)
      cardSuite = getCardSuite(card)
      if (isCardAHigher(cardValue, sum.value, cardSuite, sum.cardSuite)) {
        return { cardSuite: cardSuite, value: cardValue, card: card }
      }
      return sum
    },
    { cardSuite: "", value: 0, card: "" }
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
    switch (splitCardValues) {
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

const isCardAHigher = (cardAValue, cardBValue, cardASuite, cardBsuite) => {
  return (
    cardAValue > cardBValue ||
    (cardAValue == cardBValue && isCardASuiteGreater(cardASuite, cardBsuite))
  )
}

const isCardASuiteGreater = (cardSuiteA, cardSuiteB) => {
  return getCardSuiteRankValue(cardSuiteA) > getCardSuiteRankValue(cardSuiteB)
}

const getCardSuiteRankValue = cardSuite => {
  let rankValue = 0
  switch (cardSuite) {
    case suiteRank.S.char:
      rankValue = suiteRank.S.value
      break
    case suiteRank.H.char:
      rankValue = suiteRank.H.value
      break
    case suiteRank.C.char:
      rankValue = suiteRank.C.value
      break
    case suiteRank.D.char:
      rankValue = suiteRank.D.value
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
