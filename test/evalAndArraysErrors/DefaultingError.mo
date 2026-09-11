within evalAndArraysErrors;

block DefaultingError "A parameter of the sequence itself that nothing gives a value to"

  parameter Real kMin(min=0.1) "Only a min, expect 0.1";
  parameter Real kNone "Nothing anywhere, expect the run to stop";

end DefaultingError;
