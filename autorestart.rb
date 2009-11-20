#!/usr/bin/env ruby
require 'rubygems'
require 'bind'

# From http://gist.github.com/237134
 
restart = lambda do
  if @pid
    Process.kill "TERM", @pid
    Process.wait @pid
  end
  @pid = Process.fork
  # change start.js here to the filename which starts your process
  exec "node nodecast.js" if @pid.nil?
end
 
restart.call
 
listener = Bind::Listener.new \
  :interval => 1,
#  :debug => $stdout,
  :actions => [restart],
  :paths => Dir['**/*.{js,jsont}'] # extensions which when modified trigger restart
 
listener.run!

