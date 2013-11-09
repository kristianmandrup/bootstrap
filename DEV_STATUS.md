## Development Status

This branch was forked off from kristianmandrup:bootstrap3-dev, Nov 9, 2013.

The Angular version used is the *1.2.0* as per Nov 8, 2013. We also intend to test using *jQuery* 1.10.x and 2.0.x which are also included (see misc/test-lib)

*Angular-mocks* has also been upgrade to the latest 1.2.0 release

## Test status

Building and running the tests:

`$ grunt`

`Chrome 31.0 (Mac): Executed 482 of 482 (111 FAILED)`

The directives most affected are:

* timepicker
* datepicker
* rating
* tooltip
* tabs

### Datepicker
Almost all specs fail it seems. Something very core in its internals needs a refactor!

### Timepicker
Same as datepicker (very related) - perhaps due to a change of internal Date handling in 1.2.0 ?

### Rating

All errors of are of this type: *Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys*

Most likely this just requires the rating spec to be refactored to avoid duplicates and/or use the new *track by* feature :)

```
Chrome 31.0 (Mac) rating directive setting ratingConfig should change icon states FAILED
  Error: [ngRepeat:dupes] Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: r in range, Duplicate key: object:3P2
  http://errors.angularjs.org/1.2.0/ngRepeat/dupes?p0=r%20in%20range&p1=object%3A3P2
      at misc/test-lib/angular.js:78:12
      at ngRepeatAction (/misc/test-lib/angular.js:18664:20)
      at Object.$watchCollectionAction [as fn] (misc/test-lib/angular.js:11299:11)
      at Scope.$digest (/misc/test-lib/angular.js:11395:27)
      at null.<anonymous> (src/rating/test/rating.spec.js:10:16)
      at Object.invoke (misc/test-lib/angular.js:3617:28)
      at workFn (misc/test-lib/angular-mocks.js:2119:20)
  Error: [$rootScope:inprog] $digest already in progress
  http://errors.angularjs.org/1.2.0/$rootScope/inprog?p0=%24digest
      at misc/test-lib/angular.js:78:12
      at beginPhase (/misc/test-lib/angular.js:11830:15)
      at Scope.$digest (/misc/test-lib/angular.js:11364:9)
      at null.<anonymous> (/src/rating/test/rating.spec.js:179:18)
      at Object.invoke (/misc/test-lib/angular.js:3617:28)
      at workFn (/misc/test-lib/angular-mocks.js:2119:20)
  Expected [  ] to equal [ true, true, true, true, true, false, false, false, false, false ].
  Error: Expected [  ] to equal [ true, true, true, true, true, false, false, false, false, false ].
      at null.<anonymous> (/src/rating/test/rating.spec.js:191:37)
```

## Tooltip 

A few specs fail

```
Chrome 31.0 (Mac) tooltip should only have an isolate scope on the popup FAILED
  Expected undefined to be 'top'.
  Error: Expected undefined to be 'top'.
      at null.<anonymous> (test/tooltip.spec.js:109:33)
  Expected undefined to be 'Tooltip Text'.
  Error: Expected undefined to be 'Tooltip Text'.
      at null.<anonymous> (test/tooltip.spec.js:110:31)
Chrome 31.0 (Mac) tooltip with a trigger attribute should use it to show but set the hide trigger based on the map for mapped triggers FAILED
  Expected false to be truthy.
  Error: Expected false to be truthy.
      at null.<anonymous> (test/tooltip.spec.js:192:36)
Chrome 31.0 (Mac) tooltip cleanup should not contain a cached reference FAILED
  Expected false to be truthy.
  Error: Expected false to be truthy.
      at null.<anonymous> (test/tooltip.spec.js:294:27)
Chrome 31.0 (Mac) tooltip cleanup should not contain a cached reference FAILED
  Expected false to be truthy.
  Error: Expected false to be truthy.
      at null.<anonymous> (test/tooltip.spec.js:300:27)
Chrome 31.0 (Mac) tooltipWithDifferentSymbols should show the correct tooltip text FAILED
  Expected undefined to be 'My tooltip'.
  Error: Expected undefined to be 'My tooltip'.
      at null.<anonymous> (tooltip/test/tooltip.spec.js:335:59)
Chrome 31.0 (Mac) $tooltipProvider triggers triggers with a mapped value should use the show trigger and the mapped value for the hide trigger FAILED
  Expected false to be truthy.
  Error: Expected false to be truthy.
      at null.<anonymous> (test/tooltip.spec.js:490:38)
```

## Tabs
A few specs fail

```
Chrome 31.0 (Mac) tabs advanced tab-heading element should create a heading bound to myHtml FAILED
  Expected '
      ' to be '<b>hello</b>, there!'.
  Error: Expected '
      ' to be '<b>hello</b>, there!'.
      at null.<anonymous> (test/tabsSpec.js:205:38)
Chrome 31.0 (Mac) tabs advanced tab-heading element should hide and show the heading depending on value FAILED
  Expected '' to be 'none'.
  Error: Expected '' to be 'none'.
      at null.<anonymous> (test/tabsSpec.js:211:46)
```

## The plan

To get a better overview, the test suites for *datepicker* and *timepicker* have been _disabled_ for now.

Current status with these test suites disabled:

`Executed 334 of 334 (23 FAILED)`

Now we need to make progress, one failing spec at a time. Rating just requires a small refactor of the spec itself using the new *track by* feature.

Please help out. *Thanks for your effort :)*

