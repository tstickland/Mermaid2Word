// Starter samples for every diagram type listed in the Mermaid docs sidebar.
// Samples are adapted from https://mermaid.ai/open-source/syntax/*.

export interface DiagramTemplate {
  id: string;
  name: string;
  source: string;
}

export const TEMPLATES: DiagramTemplate[] = [
  {
    id: "flowchart",
    name: "Flowchart",
    source: `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`,
  },
  {
    id: "swimlanes",
    name: "Swimlanes Diagram",
    source: `swimlane-beta LR
  subgraph Customer
    Browse[Browse catalogue]
    Pay[Pay]
  end
  subgraph Warehouse
    Pick[Pick items]
    Ship[Ship order]
  end
  subgraph Finance
    Invoice[Raise invoice]
  end
  Browse --> Pay
  Pay --> Pick
  Pick --> Ship
  Pay --> Invoice`,
  },
  {
    id: "sequence",
    name: "Sequence Diagram",
    source: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great, thanks!
    Alice-)Bob: See you later!`,
  },
  {
    id: "class",
    name: "Class Diagram",
    source: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal : +isMammal() bool
    class Duck {
      +String beakColor
      +swim()
      +quack()
    }
    class Fish {
      -int sizeInFeet
      -canEat()
    }`,
  },
  {
    id: "state",
    name: "State Diagram",
    source: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
  },
  {
    id: "er",
    name: "Entity Relationship Diagram",
    source: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
      string name
      string email
    }
    ORDER {
      int id
      date created
    }`,
  },
  {
    id: "journey",
    name: "User Journey",
    source: `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me`,
  },
  {
    id: "gantt",
    name: "Gantt",
    source: `gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
      A task          :a1, 2024-01-01, 30d
      Another task    :after a1, 20d
    section Another
      Task in Another :2024-01-12, 12d
      another task    :24d`,
  },
  {
    id: "pie",
    name: "Pie Chart",
    source: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
  },
  {
    id: "quadrant",
    name: "Quadrant Chart",
    source: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]`,
  },
  {
    id: "requirement",
    name: "Requirement Diagram",
    source: `requirementDiagram

    requirement test_req {
      id: 1
      text: the test text.
      risk: high
      verifymethod: test
    }

    element test_entity {
      type: simulation
    }

    test_entity - satisfies -> test_req`,
  },
  {
    id: "usecase",
    name: "Use Case Diagram",
    source: `usecase-beta
direction LR
actor Customer
actor Support
systemBoundary Storefront
  Browse("Browse catalogue")
  Checkout("Checkout")
end
systemBoundary Fulfilment
  Track("Track delivery")
end
Customer --> Browse
Customer --> Checkout
Customer --> Track
Support --> Track`,
  },
  {
    id: "gitgraph",
    name: "GitGraph (Git) Diagram",
    source: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`,
  },
  {
    id: "c4",
    name: "C4 Diagram",
    source: `C4Context
    title System Context diagram for Internet Banking System
    Person(customer, "Banking Customer", "A customer of the bank.")
    System(banking, "Internet Banking System", "Allows customers to view their accounts.")
    System_Ext(mail, "E-mail system", "The internal e-mail system.")
    Rel(customer, banking, "Uses")
    Rel(banking, mail, "Sends e-mails", "SMTP")
    Rel(mail, customer, "Sends e-mails to")`,
  },
  {
    id: "mindmap",
    name: "Mindmaps",
    source: `mindmap
  root((mindmap))
    Origins
      Long history
      Popularisation
    Research
      On effectiveness
      On automatic creation
    Tools
      Pen and paper
      Mermaid`,
  },
  {
    id: "timeline",
    name: "Timeline",
    source: `timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook
         : Google
    2005 : YouTube
    2006 : Twitter`,
  },
  {
    id: "zenuml",
    name: "ZenUML",
    source: `zenuml
    title Demo
    Alice->John: Hello John, how are you?
    John->Alice: Great!
    Alice->John: See you later!`,
  },
  {
    id: "sankey",
    name: "Sankey",
    source: `sankey

Electricity grid,Industry,342
Electricity grid,Homes,113
Electricity grid,Losses,56
Gas,Industry,48
Gas,Thermal generation,151
Thermal generation,Electricity grid,120`,
  },
  {
    id: "xychart",
    name: "XY Chart",
    source: `xychart
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500]
    line [5000, 6000, 7500, 8200, 9500, 10500]`,
  },
  {
    id: "block",
    name: "Block Diagram",
    source: `block
columns 3
  a["Frontend"] b["API"] c["Database"]
  space:3
  d["Cache"]:3
  a --> b
  b --> c
  b --> d`,
  },
  {
    id: "packet",
    name: "Packet",
    source: `packet
title UDP Packet
0-15: "Source Port"
16-31: "Destination Port"
32-47: "Length"
48-63: "Checksum"
64-95: "Data (variable length)"`,
  },
  {
    id: "kanban",
    name: "Kanban",
    source: `kanban
  todo[Todo]
    t1[Write documentation]
    t2[Design the logo]
  doing[In progress]
    t3[Build the renderer]
  done[Done]
    t4[Set up project]`,
  },
  {
    id: "architecture",
    name: "Architecture",
    source: `architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Storage] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db`,
  },
  {
    id: "radar",
    name: "Radar",
    source: `radar-beta
  title Grades
  axis m["Math"], s["Science"], e["English"]
  axis h["History"], g["Geography"], a["Art"]
  curve a["Alice"]{85, 90, 80, 70, 75, 90}
  curve b["Bob"]{70, 75, 85, 80, 90, 85}
  max 100
  min 0`,
  },
  {
    id: "eventmodeling",
    name: "Event Modeling",
    source: `eventmodeling

tf 01 ui CartUI
tf 02 cmd AddItem { description: string }
tf 03 evt ItemAdded { description: string }`,
  },
  {
    id: "treemap",
    name: "Treemap",
    source: `treemap-beta
"Category A"
    "Item A1": 10
    "Item A2": 20
"Category B"
    "Item B1": 15
    "Item B2": 25`,
  },
  {
    id: "venn",
    name: "Venn",
    source: `venn-beta
  title What makes a good feature
  set Desirable
  set Feasible
  set Viable
  union Desirable,Feasible["Buildable"]
  union Feasible,Viable["Sustainable"]
  union Desirable,Viable["Marketable"]
  union Desirable,Feasible,Viable["Ship it"]`,
  },
  {
    id: "ishikawa",
    name: "Ishikawa",
    source: `ishikawa-beta
    Blurry Photo
    Process
        Out of focus
        Shutter speed too slow
    User
        Shaky hands
    Equipment
        Lens
            Dirty lens
            Damaged lens
    Environment
        Subject moved too quickly
        Too dark`,
  },
  {
    id: "wardley",
    name: "Wardley",
    source: `wardley-beta
title Tea Shop Value Chain

anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61]
component Tea [0.63, 0.81]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35]
component Power [0.10, 0.70]

Business -> Cup of Tea
Cup of Tea -> Tea
Cup of Tea -> Hot Water
Hot Water -> Kettle
Kettle -> Power

evolve Kettle 0.62
evolve Power 0.89`,
  },
  {
    id: "cynefin",
    name: "Cynefin",
    source: `cynefin-beta
  title Strategy Categorization

  complex
    "Market research"

  complicated
    "Competitive analysis"

  clear
    "Standard pricing"

  chaotic
    "Crisis management"

  complex --> complicated : "Pattern identified"
  complicated --> clear : "Best practice codified"
  clear --> chaotic : "Complacency"
  chaotic --> complex : "Stabilized"`,
  },
  {
    id: "treeview",
    name: "TreeView",
    source: `treeView-beta
├── src/
│   ├── index.ts
│   └── utils.ts
├── package.json
└── README.md`,
  },
];
