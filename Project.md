## Tech Stack
Using SvelteKit, Tailwind, TypeScript for frontend, Bun as runtime/package-manager, and FastAPI for backend

## Description
Framework enable user to make app with multi-views (windows)
something could work to create (IDE or DiagramEditor)

## Elements
Build framework have the following elments: [ServiceServer, ServiceClient, Plugin, Window]
- ServiceServer : just like any backend server
    like FilesServer which enable user to list / read / write anything from fileSystem
      
- ServiceClient : Classes that make the apis that a server provide, into methods
    Any plugins can create an instance of it and use it
    like FilesClient which make methods based on the FileServer to enable the developer later simple call methods to reach the file system
    :: each serviceClient talk with 1..N serviceServer
    :: props:
        - serviceServers with their ips and routes

- Plugin : component that has UI contained in a Window. or it could have no window and no UI
    :: each plugin have a config file : it contains instance from PluginConfig (that is defined in the lib)
    :: PluginConfig contain WinConfig and id, name
    plugin can make apis methods so other plugins can talk to it, at least there should be hide/show for each plugin

           
- Window : component that act like any window in an OS desktop
    could be [resizable, movable, snappable to side in the web-app boundries OR to a boundries of other window]
    its boundries not exceed the boundries of the web-app
    props: title, bounds, boundslimits, hasHeader, movable, resizeable (those should be defined alson in WinConfig)
    - it could be moved from a button icon in the top left
    - the header is small rectangle in the top left 


- Store : it is used to share info between Plugins


- App : contain config files - telling what are the plugins that it should be contianed in the app


- UserConfigs : like layout for pluginsWindows
                {PluginName, Boundries} this should override WinConfig.bounds of a plugin


## Notes
- It should be extensible, minimal, simple 
