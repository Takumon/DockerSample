# Description
#   A Hubot script for listing advent calendars in Adventar
#
# Configuration:
#   None
#
# Commands:
#   hubot adventar <query> - lists advent calendars in Adventar
cheerio = require 'cheerio'
request = require 'request'

module.exports = (robot) ->

  robot.respond /adventar(?: (\S+))?/, (msg) ->
    query = msg.match[1]
    # send HTTP request
    baseUrl = 'https://www.adventar.org'
    request baseUrl + '/', (_, res, body) ->

      $ = cheerio.load body

      calendars = []
      JSON.parse($('[data-react-props]').attr('data-react-props')).calendars.forEach (calendar)->
        url = "#{baseUrl}/calendars/#{calendar.id}"
        name = calendar.title
        calendars.push { url, name }


      filtered = calendars.filter (c) ->
        if query? then c.name.match(new RegExp(query, 'i')) else true

      message = filtered
        .map (c) ->
          "#{c.name} #{c.url}"
        .join '\n'

      msg.send message