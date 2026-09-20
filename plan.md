\# Taco \& Tanya Desktop Pet



\## 1. Project goal



Build a small macOS desktop application that displays animated versions of two real rabbits, \*\*Taco\*\* and \*\*Tanya\*\*, moving around the user's desktop.



The application should feel similar to the desktop pets and desktop decorations that were popular in the 2000s, but with substantially better visuals and behaviour.



The important emotional requirement is that Taco and Tanya should be immediately recognisable as the user's actual rabbits.



The application is intended as a personal gift, not initially as a commercial product.



The priorities are therefore:



1\. recognisable likeness to Taco and Tanya

2\. charming autonomous behaviour

3\. minimal interference with normal computer use

4\. reliable macOS behaviour

5\. simple architecture that allows the graphics system to be upgraded later



The first version should use \*\*2D animated sprites\*\*, while keeping the rendering architecture sufficiently abstract that the application could later use 3D models without rewriting the behaviour system.



\---



\# 2. Recommended architecture



Use:



\* \*\*Electron\*\*

\* \*\*TypeScript\*\*

\* \*\*Vite\*\*

\* \*\*PixiJS\*\*

\* optionally React for settings UI only, although it is not required for the pet renderer



The application should consist conceptually of four systems:



```text

┌───────────────────────────────────────────────┐

│               Electron shell                  │

│                                               │

│  transparent windows                          │

│  display management                           │

│  click-through behaviour                      │

│  app lifecycle                                │

│  tray/menu                                    │

│  launch-at-login                              │

└───────────────────┬───────────────────────────┘

&#x20;                   │

&#x20;                   ▼

┌───────────────────────────────────────────────┐

│                 Pet engine                    │

│                                               │

│  Taco state machine                           │

│  Tanya state machine                          │

│  movement                                     │

│  behavioural decisions                        │

│  rabbit-rabbit interaction                    │

│  screen boundary logic                        │

└───────────────────┬───────────────────────────┘

&#x20;                   │

&#x20;                   ▼

┌───────────────────────────────────────────────┐

│             Rendering abstraction             │

│                                               │

│  render pet                                   │

│  play animation                               │

│  orientation                                  │

│  scale                                        │

└───────────────────┬───────────────────────────┘

&#x20;                   │

&#x20;        ┌──────────┴──────────┐

&#x20;        ▼                     ▼

┌────────────────┐    ┌────────────────┐

│ SpriteRenderer │    │ ThreeRenderer  │

│                │    │                │

│ PixiJS         │    │ Three.js       │

│ V1             │    │ possible V2    │

└────────────────┘    └────────────────┘

```



The key architectural principle is:



\*\*The pet behaviour system must not know whether Taco and Tanya are sprites or 3D models.\*\*



Behaviour should deal with concepts such as:



```text

idle

hop

run

sit

groom

sleep

lookAround

approachOtherRabbit

```



The renderer should be responsible for turning those states into visible animation.



\---



\# 3. Why 2D should be V1



Do not begin by trying to generate complete 3D rabbits from photographs.



Image-to-3D generation creates several additional problems:



\* topology may be unsuitable for animation

\* fur representation can be poor

\* limbs may not rig properly

\* ears may distort

\* paws and facial anatomy may vary

\* generated meshes may have incorrect proportions

\* animation retargeting becomes another project

\* likeness may actually be worse at desktop scale



At approximately 100 to 200 pixels high, recognition will depend much more strongly on:



\* coat pattern

\* body colour

\* ear shape

\* ear orientation

\* face shape

\* nose markings

\* relative head/body proportions

\* distinctive patches

\* posture

\* characteristic behaviour



A good 2D representation can therefore achieve stronger likeness with considerably less complexity.



The asset pipeline should initially be:



```text

photos of Taco and Tanya

&#x20;       ↓

consistent character reference images

&#x20;       ↓

animation poses

&#x20;       ↓

frame cleanup and alignment

&#x20;       ↓

sprite sheets / texture atlases

&#x20;       ↓

PixiJS

```



AI can be used heavily during asset generation.



Do not rely on generating a complete sprite sheet in one image-generation request. That is likely to cause frame-to-frame inconsistency.



Instead establish a canonical visual representation of each rabbit first.



\---



\# 4. Recommended repository structure



A reasonable initial structure would be:



```text

taco-tanya-desktop/

│

├── package.json

├── vite.config.ts

├── tsconfig.json

│

├── src/

│   │

│   ├── main/

│   │   ├── main.ts

│   │   ├── windowManager.ts

│   │   ├── displayManager.ts

│   │   ├── inputPassthrough.ts

│   │   ├── startup.ts

│   │   └── ipc.ts

│   │

│   ├── renderer/

│   │   ├── index.ts

│   │   ├── app.ts

│   │   │

│   │   ├── pets/

│   │   │   ├── Pet.ts

│   │   │   ├── PetController.ts

│   │   │   ├── PetState.ts

│   │   │   ├── PetProfile.ts

│   │   │   └── PetPersonality.ts

│   │   │

│   │   ├── behaviour/

│   │   │   ├── BehaviourController.ts

│   │   │   ├── StateMachine.ts

│   │   │   ├── transitions.ts

│   │   │   └── interactions.ts

│   │   │

│   │   ├── movement/

│   │   │   ├── movementController.ts

│   │   │   ├── screenBounds.ts

│   │   │   └── motionProfiles.ts

│   │   │

│   │   ├── rendering/

│   │   │   ├── IPetRenderer.ts

│   │   │   ├── SpritePetRenderer.ts

│   │   │   └── spriteAnimations.ts

│   │   │

│   │   └── input/

│   │       ├── pointerTracker.ts

│   │       └── hitTesting.ts

│   │

│   ├── config/

│   │   ├── taco.ts

│   │   ├── tanya.ts

│   │   └── defaults.ts

│   │

│   └── shared/

│       ├── Vector2.ts

│       └── types.ts

│

├── assets/

│   ├── taco/

│   │   ├── idle/

│   │   ├── hop/

│   │   ├── run/

│   │   ├── groom/

│   │   └── sleep/

│   │

│   └── tanya/

│       ├── idle/

│       ├── hop/

│       ├── run/

│       ├── groom/

│       └── sleep/

│

└── tests/

```



Do not over-engineer this structure immediately. It describes the intended conceptual separation.



\---



\# 5. Core pet model



Each rabbit should have runtime state independent of its renderer.



For example:



```ts

export interface Pet {

&#x20;   id: "taco" | "tanya";



&#x20;   profile: PetProfile;

&#x20;   personality: PetPersonality;



&#x20;   state: PetState;



&#x20;   position: Vector2;

&#x20;   velocity: Vector2;



&#x20;   facing: "left" | "right";



&#x20;   stateElapsedMs: number;

&#x20;   stateDurationMs?: number;



&#x20;   targetPosition?: Vector2;

}

```



The pet state enum could begin with:



```ts

export type PetState =

&#x20;   | "idle"

&#x20;   | "lookAround"

&#x20;   | "hop"

&#x20;   | "run"

&#x20;   | "sit"

&#x20;   | "groom"

&#x20;   | "sleep"

&#x20;   | "approachOtherRabbit"

&#x20;   | "sitWithOtherRabbit";

```



Do not add dozens of states before the basic system works.



\---



\# 6. Rabbit profiles



Separate visual identity from behavioural personality.



Example:



```ts

export interface PetProfile {

&#x20;   id: string;

&#x20;   displayName: string;



&#x20;   baseScale: number;



&#x20;   spriteSet: string;



&#x20;   visualOffsetX?: number;

&#x20;   visualOffsetY?: number;



&#x20;   hitboxWidth: number;

&#x20;   hitboxHeight: number;

}

```



Taco and Tanya can then have independent profiles:



```ts

export const tacoProfile: PetProfile = {

&#x20;   id: "taco",

&#x20;   displayName: "Taco",

&#x20;   baseScale: 1,

&#x20;   spriteSet: "taco",

&#x20;   hitboxWidth: 120,

&#x20;   hitboxHeight: 100

};

```



and similarly for Tanya.



\---



\# 7. Personality system



Each rabbit should feel slightly different.



Do this through numeric behavioural parameters rather than separate hard-coded state machines.



For example:



```ts

export interface PetPersonality {

&#x20;   activity: number;

&#x20;   curiosity: number;

&#x20;   sociability: number;

&#x20;   sleepiness: number;

&#x20;   groomingFrequency: number;

&#x20;   restlessness: number;

}

```



Values can initially range from 0 to 1.



Example:



```ts

const tacoPersonality = {

&#x20;   activity: 0.75,

&#x20;   curiosity: 0.8,

&#x20;   sociability: 0.7,

&#x20;   sleepiness: 0.35,

&#x20;   groomingFrequency: 0.4,

&#x20;   restlessness: 0.65

};



const tanyaPersonality = {

&#x20;   activity: 0.5,

&#x20;   curiosity: 0.5,

&#x20;   sociability: 0.85,

&#x20;   sleepiness: 0.6,

&#x20;   groomingFrequency: 0.65,

&#x20;   restlessness: 0.35

};

```



These values are placeholders only.



Once the owner describes how Taco and Tanya actually behave, change the values accordingly.



\---



\# 8. Behaviour architecture



Use a simple state machine.



Avoid introducing an elaborate AI framework.



Every few hundred milliseconds, or whenever an animation completes, the behaviour controller should decide whether the rabbit should remain in its current state or transition.



Conceptually:



```ts

function updateBehaviour(pet: Pet, context: WorldContext): void {

&#x20;   if (!canTransition(pet)) return;



&#x20;   const candidates = getPossibleTransitions(pet, context);



&#x20;   const weightedCandidates = candidates.map(candidate => ({

&#x20;       ...candidate,

&#x20;       weight: calculateWeight(candidate, pet, context)

&#x20;   }));



&#x20;   const next = weightedRandom(weightedCandidates);



&#x20;   transitionTo(pet, next.state);

}

```



Possible transition weight factors include:



\* personality

\* amount of time since last activity

\* proximity to other rabbit

\* distance from screen edge

\* time of day, potentially later

\* whether the mouse is nearby

\* randomness



The resulting behaviour should feel unpredictable but plausible.



\---



\# 9. Example behaviour rules



Initial behaviour can be fairly simple.



\### Idle



After sitting still for several seconds:



```text

idle

&#x20; ├── look around

&#x20; ├── groom

&#x20; ├── hop somewhere

&#x20; ├── approach other rabbit

&#x20; └── sleep

```



\### Hop



Select a target point:



```text

current position

&#x20;      ↓

choose target X

&#x20;      ↓

hop/run towards target

&#x20;      ↓

arrive

&#x20;      ↓

idle/sit

```



Movement should predominantly occur horizontally.



Desktop pets look more believable if they appear to sit on an imaginary floor line rather than freely move vertically around the entire screen.



V1 should probably position both rabbits near the bottom edge of the current display.



Later, vertical interactions could include:



\* hopping onto the Dock

\* jumping onto application windows

\* climbing onto one another

\* sitting on menu-bar-like surfaces



Do not implement these initially.



\---



\# 10. Rabbit-rabbit interaction



This is likely to add disproportionately high charm.



Possible interactions:



```text

Taco notices Tanya

&#x20;       ↓

Taco approaches

&#x20;       ↓

Tanya waits

&#x20;       ↓

both sit together

```



or:



```text

Tanya approaches Taco

&#x20;       ↓

both briefly interact

&#x20;       ↓

one hops away

```



Eventually:



\* sit side by side

\* sleep together

\* chase

\* nose-touch

\* groom one another

\* follow one another



For V1, implement only:



1\. approach

2\. sit together

3\. separate again



This is enough to demonstrate the architecture.



\---



\# 11. Rendering interface



Create an abstraction such as:



```ts

export interface IPetRenderer {

&#x20;   createPet(pet: Pet): void;



&#x20;   updatePet(

&#x20;       pet: Pet,

&#x20;       deltaMs: number

&#x20;   ): void;



&#x20;   removePet(petId: string): void;



&#x20;   hitTest(

&#x20;       petId: string,

&#x20;       screenX: number,

&#x20;       screenY: number

&#x20;   ): boolean;

}

```



The behaviour engine must never access PixiJS sprites directly.



\---



\# 12. PixiJS sprite renderer



V1 should implement:



```ts

export class SpritePetRenderer implements IPetRenderer {

&#x20;   // Pixi implementation

}

```



Each behaviour state maps to an animation.



For example:



```ts

const animationMap = {

&#x20;   idle: "idle",

&#x20;   lookAround: "look",

&#x20;   hop: "hop",

&#x20;   run: "run",

&#x20;   sit: "sit",

&#x20;   groom: "groom",

&#x20;   sleep: "sleep",

&#x20;   approachOtherRabbit: "hop",

&#x20;   sitWithOtherRabbit: "sit"

};

```



Facing right can normally be achieved by horizontally mirroring the sprite.



Therefore it is not necessary to generate left-facing and right-facing animations.



\---



\# 13. Initial animation requirements



Target roughly:



```text

idle / breathing       4-6 frames

look around            4-8 frames

hop                     6-10 frames

run                     6-10 frames

sit                     2-4 frames

groom                   8-16 frames

sleep                   2-4 frames

```



This means perhaps 40 to 60 unique frames per rabbit.



There is no requirement to reach that count immediately.



Development should begin using crude placeholder graphics.



A coloured rectangle labelled `TACO` and another labelled `TANYA` are acceptable during the first implementation.



Do not block application development on artwork.



\---



\# 14. Asset-generation strategy



Once the desktop engine works, build accurate visual assets.



Obtain good photographs of both Taco and Tanya including:



\* left side

\* right side

\* front

\* three-quarter view

\* sitting

\* standing

\* ears clearly visible

\* close-up of face

\* coat markings

\* tail if distinctive



Create a visual reference sheet for each rabbit.



For each rabbit, document:



```text

body colour:

belly colour:

face markings:

nose colour:

ear colour:

ear length:

ear shape:

eye colour:

body proportions:

distinctive patches:

distinctive asymmetries:

```



The canonical character design should preserve these features.



AI-generated animation frames should then use that character sheet as the reference.



Consistency is more important than absolute realism.



The final character should look like the same rabbit in every frame.



\---



\# 15. Sprite alignment



Every animation frame should use the same canvas dimensions.



For example:



```text

512 × 512 transparent PNG

```



Each rabbit should have a defined visual anchor point.



The most useful anchor is approximately the point where its feet contact the ground.



For example:



```ts

interface AnimationFrameMetadata {

&#x20;   anchorX: number;

&#x20;   anchorY: number;

}

```



Without consistent anchors, the rabbit will visibly jump around between animation frames.



The asset-processing pipeline should eventually automate:



\* transparent background cleanup

\* bounding-box detection

\* frame cropping

\* normalisation

\* anchor alignment

\* sprite sheet packing



\---



\# 16. Desktop window architecture



The Electron application should use a frameless transparent window.



Important properties include conceptually:



```ts

new BrowserWindow({

&#x20;   transparent: true,

&#x20;   frame: false,

&#x20;   resizable: false,

&#x20;   hasShadow: false,

&#x20;   alwaysOnTop: true

});

```



Exact options should be verified against the current Electron APIs.



The transparent renderer should draw only Taco and Tanya.



Everything else should remain visually transparent.



\---



\# 17. Click-through behaviour



A desktop pet must not prevent normal use of applications beneath it.



Most of the transparent window should therefore ignore mouse events.



Conceptually:



```ts

window.setIgnoreMouseEvents(true, {

&#x20;   forward: true

});

```



The renderer should track pointer position.



If the pointer enters a rabbit's visible/hitbox area, interaction can potentially be enabled.



Conceptually:



```ts

if (pointerIsOverRabbit) {

&#x20;   disableClickThrough();

} else {

&#x20;   enableClickThrough();

}

```



However, this should not be allowed to interfere with normal computer use.



For V1, it is acceptable to make the rabbits completely click-through.



Interactive behaviour can be added later.



\---



\# 18. Possible pointer interactions



Later versions could support:



\### Hover



Rabbit looks towards pointer.



\### Click



Rabbit reacts.



Possible reaction:



```text

look up

ear twitch

small hop

```



\### Drag



Allow user to pick rabbit up and move it.



\### Petting



Moving the pointer repeatedly across the rabbit could trigger a happy or relaxed state.



Do not implement all of these before autonomous behaviour is working.



\---



\# 19. Display coordinate system



Use logical display coordinates rather than assuming a single fixed resolution.



The pet engine should operate in something like:



```ts

interface DesktopBounds {

&#x20;   x: number;

&#x20;   y: number;

&#x20;   width: number;

&#x20;   height: number;

}

```



The usable rabbit floor position could initially be:



```ts

floorY = screen.height - rabbitHeight - bottomMargin;

```



Bottom margin may need tuning around the macOS Dock.



\---



\# 20. Multi-monitor support



Do not make full multi-monitor support a prerequisite for the initial prototype.



However, architecture should not assume one monitor forever.



Eventually:



```text

Electron main process

&#x20;   ↓

enumerate displays

&#x20;   ↓

one transparent renderer window per display

```



or alternatively one appropriate window following the active display.



Start with one display.



\---



\# 21. Frame update loop



The renderer should run normally at the browser refresh rate.



Separate visual updates from behavioural decisions.



For example:



```text

60 Hz-ish:

&#x20;   update position

&#x20;   update animation

&#x20;   render



2-5 Hz:

&#x20;   reconsider behaviour

```



Avoid choosing a new behavioural action every frame.



\---



\# 22. Motion



Rabbit motion should not be simple constant-velocity sliding.



A hop needs visible acceleration and deceleration.



For an initial simplified implementation:



```ts

x = lerp(startX, targetX, ease(t));

```



The animation itself can provide the apparent vertical movement.



Do not physically move the whole sprite vertically unless it improves the result.



The rabbit's feet should appear to remain associated with the desktop floor.



\---



\# 23. Idle timing



Avoid repetitive robotic behaviour.



Use randomised duration ranges.



For example:



```text

idle              2-8 s

look around        1-3 s

sit                3-12 s

groom              animation dependent

sleep              15-120 s

```



These should later be modified by personality values.



\---



\# 24. Randomness



Use bounded randomness.



Bad:



```text

every 1 second choose completely random action

```



Better:



```text

rabbit remains in state for a plausible duration



when transition occurs:

&#x20;   calculate currently plausible states

&#x20;   apply personality/context weighting

&#x20;   choose weighted state

```



The user should not easily perceive a repeating loop.



\---



\# 25. Persistence



Persist only simple user settings initially.



For example:



```json

{

&#x20;   "enabled": true,

&#x20;   "scale": 1,

&#x20;   "volume": 0,

&#x20;   "launchAtLogin": true

}

```



Pet position itself does not necessarily need persistence.



Taco and Tanya can choose a sensible initial position each time the app launches.



\---



\# 26. Settings UI



Keep settings minimal.



Possible tray/menu options:



```text

Taco \& Tanya



Show rabbits

Hide rabbits



Size

&#x20;   Small

&#x20;   Medium

&#x20;   Large



Launch at login



Quit

```



Potential later options:



```text

Activity

&#x20;   Sleepy

&#x20;   Normal

&#x20;   Chaotic



Interactions

&#x20;   Enabled

&#x20;   Disabled

```



Do not spend substantial effort building a polished settings interface before the pets work.



\---



\# 27. Sounds



V1 should probably be silent.



Rabbit sounds are likely unnecessary and may become irritating.



Subtle occasional sounds could be considered later, but silence is a better default.



\---



\# 28. 3D upgrade path



If the sprite approach eventually proves visually limiting, implement a second renderer:



```ts

class ThreePetRenderer implements IPetRenderer

```



using Three.js.



Do not replace the behaviour system.



Potential 3D asset pipeline:



```text

high-quality rigged rabbit model

&#x20;       ↓

modify body proportions

&#x20;       ↓

modify ears/head

&#x20;       ↓

paint Taco texture

&#x20;       ↓

paint Tanya texture

&#x20;       ↓

reuse rabbit skeleton

&#x20;       ↓

create/retarget animations

&#x20;       ↓

export GLB

&#x20;       ↓

Three.js

```



This is preferable to directly generating final animated 3D rabbits from photographs.



If AI image-to-3D improves sufficiently, it can be used to generate reference geometry, but generated assets should still be expected to require cleanup.



\---



\# 29. 3D model interface compatibility



The existing states should map to animation clips.



For example:



```text

PetState                    GLB animation



idle                        Idle

lookAround                  LookAround

hop                         Hop

run                         Run

sit                         Sit

groom                       Groom

sleep                       Sleep

approachOtherRabbit         Hop

sitWithOtherRabbit          Sit

```



The application should therefore be able to switch from:



```text

SpritePetRenderer

```



to:



```text

ThreePetRenderer

```



without altering the state machine.



\---



\# 30. Development environment



Primary development will take place on Windows.



That is acceptable.



Most of the system can be developed and tested there:



\* state machine

\* sprite animation

\* Pixi rendering

\* movement

\* rabbit interactions

\* hit testing

\* settings

\* IPC

\* behaviour tuning



Do not delay development because the developer does not currently own a Mac.



\---



\# 31. macOS testing



macOS-specific behaviour will eventually require real macOS testing.



Important things to verify include:



\* transparent window rendering

\* Retina scaling

\* always-on-top behaviour

\* multiple Spaces

\* fullscreen applications

\* Dock interaction

\* mouse-event passthrough

\* app switching

\* launch at login

\* multi-display behaviour

\* sleep/wake

\* packaging

\* code signing

\* Gatekeeper behaviour



A virtualised or rented Mac can be used for this.



A hosted Apple Silicon Mac is preferable to trying to simulate macOS behaviour on Windows.



\---



\# 32. CI



Configure GitHub Actions fairly early.



Desired outputs:



```text

Windows dev/test build

macOS arm64 build

possibly macOS x64 build

```



The main developer can continue working on Windows while CI produces macOS packages.



This also catches platform-specific compile/package issues early.



\---



\# 33. Code signing and notarisation



For private development builds, signing is not required immediately.



For the version given to the recipient, aim for proper macOS signing and notarisation so that installing the app does not produce unnecessarily alarming security warnings.



Treat this as final packaging work rather than an MVP requirement.



\---



\# 34. Testing philosophy



Keep logic deterministic where possible.



For behaviour testing, allow the random number source to be injected.



For example:



```ts

interface RandomSource {

&#x20;   next(): number;

}

```



Production can use normal randomness.



Tests can use a seeded source.



This makes state-machine testing much easier.



\---



\# 35. Debug mode



Add a developer/debug overlay that can be toggled.



It should optionally show:



```text

Taco

state: groom

next decision: 1.4s

x: 842

target x: none



Tanya

state: approachOtherRabbit

target: Taco

x: 1210

```



Also show:



\* hitboxes

\* floor line

\* target positions

\* window bounds



This will make behavioural bugs far easier to understand.



Do not expose this UI in normal operation.



\---



\# 36. Development phases



\## Phase A: desktop proof of concept



Goal:



Prove that an animated object can behave like a desktop pet.



Use placeholder graphics.



Implement:



\* Electron

\* transparent frameless window

\* PixiJS canvas

\* one placeholder rabbit

\* simple horizontal movement

\* idle/hop states

\* screen bounds

\* click-through window



Success criterion:



A labelled placeholder rabbit can sit at the bottom of the desktop, periodically hop somewhere else, and not interfere with normal desktop use.



\---



\## Phase B: two-rabbit behaviour



Add:



\* Taco

\* Tanya

\* separate runtime state

\* separate personality configuration

\* proximity detection

\* approach-other-rabbit behaviour

\* sitting together

\* separation



Success criterion:



Taco and Tanya independently wander and occasionally interact.



\---



\## Phase C: animation system



Replace placeholder movement with animation abstractions.



Implement:



```ts

IPetRenderer

SpritePetRenderer

```



Add placeholder sprite animations for:



\* idle

\* hop

\* sit

\* groom

\* sleep



Success criterion:



State transitions correctly trigger animation transitions.



\---



\## Phase D: real Taco and Tanya artwork



Create accurate rabbit assets from photographs.



Prioritise:



1\. coat markings

2\. ears

3\. face

4\. body proportions

5\. colour

6\. recognisable posture



Do not aim for photorealism unless it genuinely looks better.



A slightly stylised but highly recognisable rabbit is preferable to a photorealistic but inconsistent one.



\---



\## Phase E: polish



Add:



\* better state transition timing

\* subtle ear/head movement

\* mouse awareness

\* sleep behaviour

\* size setting

\* menu bar/tray controls

\* launch at login



\---



\## Phase F: Mac validation



Test on actual macOS.



Fix:



\* transparency

\* scaling

\* click-through behaviour

\* display handling

\* Dock interaction

\* sleep/wake

\* packaging



\---



\## Phase G: gift build



Produce a clean `.dmg` or appropriate macOS installer/application bundle.



Include:



\* custom icon

\* app name

\* no development/debug interfaces

\* sensible startup behaviour

\* proper signing/notarisation if practical



\---



\# 37. MVP definition



The MVP is deliberately narrow.



It contains:



\* transparent desktop window

\* Taco

\* Tanya

\* recognisable custom sprite artwork

\* idle

\* hop

\* sit

\* groom

\* sleep

\* autonomous movement

\* simple interaction between the rabbits

\* click-through behaviour

\* macOS package



It does not require:



\* 3D

\* realistic physics

\* procedural animation

\* window climbing

\* sound

\* complex settings

\* cloud services

\* accounts

\* networking

\* AI running inside the finished application



AI should mainly be used during development and artwork generation.



\---



\# 38. Important design principle



Do not allow technical ambition to overwhelm the actual purpose of the project.



The successful reaction is:



> "Those are Taco and Tanya running around my screen."



The application does not need technologically sophisticated simulation to achieve that.



Recognition and behaviour are the core value.



Spend effort in approximately this priority order:



```text

likeness

&#x20;   >

animation quality

&#x20;   >

behaviour/personality

&#x20;   >

desktop integration

&#x20;   >

interaction

&#x20;   >

3D sophistication

```



\---



\# 39. First implementation task for the coding agent



Start by building only the desktop engine.



Do not create final rabbit artwork yet.



Create:



```text

Electron + TypeScript + Vite + PixiJS

```



with a transparent frameless window.



Render two temporary rabbit placeholders:



```text

TACO

TANYA

```



Each should have:



```text

position

facing direction

current state

target position

```



Implement only:



```text

idle

hop

sit

```



Behaviour:



1\. spawn both near the bottom of the screen

2\. remain idle for a random duration

3\. select a random nearby horizontal target

4\. transition to `hop`

5\. animate towards it

6\. transition back to `idle`

7\. occasionally approach the other rabbit

8\. sit near one another briefly

9\. move apart later



The window should be click-through so normal desktop interaction is unaffected.



Add a debug mode showing:



```text

pet state

position

target

hitbox

floor line

```



Do not proceed to final artwork or complicated interactions until this core system works reliably.



\---



\# 40. Definition of good architecture



The implementation is architecturally successful if the following is possible:



```ts

const renderer = new SpritePetRenderer();

```



and later:



```ts

const renderer = new ThreePetRenderer();

```



without changing:



```text

Pet

PetController

BehaviourController

StateMachine

rabbit personalities

rabbit interaction logic

```



That separation should guide all implementation decisions.



\---



\# 41. Potential future features



These are ideas only. Do not build them until the core version is complete.



\### Mouse reactions



Taco or Tanya watches the cursor.



\### Dragging



Pick a rabbit up and place it elsewhere.



\### Petting



Repeated cursor movement over the rabbit triggers a relaxed response.



\### Window awareness



Rabbits can sit on top of application windows.



\### Dock awareness



A rabbit could appear to stand behind or jump onto the Dock.



\### Sleep schedule



Behaviour changes depending on time.



\### Hidden surprises



Rare animations that occur perhaps once every several days.



\### Rabbit-specific habits



If Taco or Tanya has a recognisable real-life behaviour, recreate it.



Examples:



```text

particular sleeping position

specific ear posture

binkying

digging

nudging

flopping over

following the other rabbit

```



These kinds of details are likely to be more emotionally effective than generic technical complexity.



\---



\# 42. Immediate development instruction



Build the minimal two-rabbit placeholder prototype first.



Do not wait for final sprite assets.



Once the architecture has been demonstrated with Taco and Tanya represented by basic placeholders, the next task should be designing the visual asset pipeline from real photographs of Taco and Tanya.



Keep the first implementation small enough that it can be discarded or refactored easily if macOS desktop-window behaviour reveals an architectural problem.



